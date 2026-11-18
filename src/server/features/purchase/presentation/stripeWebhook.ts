import 'server-only'
import type Stripe from 'stripe'
import { resolveFeeAt } from '@/server/features/campaign/public'
import { savePayoutStatus } from '@/server/features/coach/public'
import { notify } from '@/server/features/notification/public'
import { createThread, requestThreadApproval, threadExists } from '@/server/features/thread/public'
import { applyInvoiceFee } from '../application/usecases/applyInvoiceFee.usecase'
import { recordAuthorization } from '../application/usecases/recordAuthorization.usecase'
import { recordPayment } from '../application/usecases/recordPayment.usecase'
import { settleInvoicePayment } from '../application/usecases/settleInvoicePayment.usecase'
import {
  cancelPaymentIntent,
  findInvoiceApplicationFee,
  refundApplicationFee,
  setInvoiceApplicationFee,
} from '../infrastructure/external-services/paymentIntents'
import { verifyStripeWebhook } from '../infrastructure/external-services/verifyStripeWebhook'
import { findPayment, savePayment } from '../infrastructure/repositories/paymentRepository'
import {
  findPurchase,
  markPurchaseAuthorized,
  markPurchasePaid,
  markPurchaseVoided,
  markSubscriptionCanceled,
} from '../infrastructure/repositories/purchaseRepository'
import {
  isStripeEventProcessed,
  markStripeEventProcessed,
} from '../infrastructure/repositories/stripeEventRepository'

const recordPaymentDeps = {
  findPurchase,
  markPurchasePaid,
  threadExists,
  createThread,
  notifyThreadStarted: (input: { threadId: string; coachUserId: string }) =>
    notify({ kind: 'thread_started', ...input }),
  generateId: () => crypto.randomUUID(),
}

const customerId = (customer: string | { id: string } | null): string | null =>
  typeof customer === 'string' ? customer : (customer?.id ?? null)

/** 月額の請求書から、申し込みとサブスクリプション（月額の請求書でなければ null） */
const subscriptionInvoice = (invoice: Stripe.Invoice) => {
  const details = invoice.parent?.subscription_details
  const purchaseId = details?.metadata?.['purchaseId']
  const subscriptionId =
    typeof details?.subscription === 'string'
      ? details.subscription
      : (details?.subscription?.id ?? null)
  if (!purchaseId || !subscriptionId || !invoice.id) return null
  return { purchaseId, subscriptionId, invoiceId: invoice.id }
}

const handleEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    // 都度払い（お試し・1スレッド）。月額は invoice.paid で扱う
    case 'checkout.session.completed': {
      const session = event.data.object
      const purchaseId = session.metadata?.['purchaseId']
      if (session.mode !== 'payment' || !purchaseId) return
      // 承認制の申し込み：カードを仮押さえした（支払いはまだ）。コーチの承認待ちにする
      const intent = session.payment_intent
      const paymentIntentId = typeof intent === 'string' ? intent : (intent?.id ?? null)
      if (session.payment_status === 'unpaid' && paymentIntentId) {
        const result = await recordAuthorization(
          {
            purchaseId,
            paymentIntentId,
            stripeCustomerId: customerId(session.customer),
            now: new Date(event.created * 1000),
          },
          {
            findPurchase,
            markPurchaseAuthorized,
            markPurchaseVoided,
            requestApproval: requestThreadApproval,
            cancelPaymentIntent,
          }
        )
        if (!result.ok) throw new Error(`仮押さえを記録できません: ${purchaseId} ${result.error}`)
        return
      }
      if (session.payment_status !== 'paid') return
      const result = await recordPayment(
        {
          purchaseId,
          stripeCustomerId: customerId(session.customer),
          subscription: null,
          paidAt: new Date(event.created * 1000),
        },
        recordPaymentDeps
      )
      if (!result.ok) throw new Error(`申し込みが見つかりません: ${purchaseId}`)
      return
    }
    // 月額の2か月目からの請求が払われた。請求ごとにスレッドを作る（初月は申し込みの承認で始まる）
    // 月額の毎月の請求書ができた（下書き。確定の約1時間前）。その時点の手数料（キャンペーンの特典を含む）を入れる
    case 'invoice.created': {
      const invoice = event.data.object
      const target = subscriptionInvoice(invoice)
      if (!target || invoice.status !== 'draft' || invoice.amount_due === 0) return
      const result = await applyInvoiceFee(
        {
          purchaseId: target.purchaseId,
          invoiceId: target.invoiceId,
          invoiceCreatedAt: new Date(invoice.created * 1000),
        },
        { findPurchase, resolveFeeAt, setInvoiceApplicationFee }
      )
      if (!result.ok) throw new Error(`申し込みが見つかりません: ${target.purchaseId}`)
      return
    }
    case 'invoice.paid': {
      const invoice = event.data.object
      const target = subscriptionInvoice(invoice)
      if (!target) return
      // サブスクリプションを始めたときの無料期間（初月は承認のときに払い済み）の0円の請求書
      if (invoice.amount_paid === 0) return
      const paidAt = new Date((invoice.status_transitions.paid_at ?? event.created) * 1000)
      const result = await recordPayment(
        {
          purchaseId: target.purchaseId,
          stripeCustomerId: customerId(invoice.customer),
          subscription: { subscriptionId: target.subscriptionId, invoiceId: target.invoiceId },
          paidAt,
        },
        recordPaymentDeps
      )
      if (!result.ok) throw new Error(`申し込みが見つかりません: ${target.purchaseId}`)
      // 手数料を確かめて記録する。invoice.created が届かず多く取っていたら、差額をコーチへ戻す
      const settled = await settleInvoicePayment(
        {
          purchaseId: target.purchaseId,
          invoiceId: target.invoiceId,
          invoiceCreatedAt: new Date(invoice.created * 1000),
          paidAt,
        },
        {
          findPurchase,
          findPayment,
          resolveFeeAt,
          findInvoiceApplicationFee,
          refundApplicationFee,
          savePayment,
        }
      )
      if (!settled.ok) throw new Error(`申し込みが見つかりません: ${target.purchaseId}`)
      if (settled.value.feeAdjustedYen > 0) {
        console.warn('[stripe] 手数料の差額を戻しました', target.invoiceId, settled.value)
      }
      return
    }
    case 'customer.subscription.deleted': {
      await markSubscriptionCanceled(event.data.object.id)
      return
    }
    // コーチの口座の状態（Connect のイベント）
    case 'account.updated': {
      const account = event.data.object
      await savePayoutStatus(account.id, account.charges_enabled)
      return
    }
    default:
      return
  }
}

/**
 * Stripe の Webhook を受ける
 *
 * - 署名を確かめてから処理する
 * - 同じイベントが2回届いても、処理済みなら何もしない（処理の中身も重複に耐えるように作る）
 * - 失敗したら 500 を返し、Stripe に再送してもらう
 */
export const handleStripeWebhook = async (request: Request): Promise<Response> => {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('署名がありません', { status: 400 })
  }
  const event = await verifyStripeWebhook(await request.text(), signature)
  if (!event) {
    return new Response('署名が正しくありません', { status: 400 })
  }

  if (await isStripeEventProcessed(event.id)) {
    return new Response('処理済み', { status: 200 })
  }
  try {
    await handleEvent(event)
  } catch (error) {
    console.error('[stripe] イベントの処理に失敗しました', event.id, event.type, error)
    return new Response('処理に失敗しました', { status: 500 })
  }
  await markStripeEventProcessed(event)
  return new Response('ok', { status: 200 })
}
