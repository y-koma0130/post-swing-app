import 'server-only'
import type Stripe from 'stripe'
import { savePayoutStatus } from '@/server/features/coach/public'
import { notify } from '@/server/features/notification/public'
import { createThread, requestThreadApproval, threadExists } from '@/server/features/thread/public'
import { recordAuthorization } from '../application/usecases/recordAuthorization.usecase'
import { recordPayment } from '../application/usecases/recordPayment.usecase'
import { cancelPaymentIntent } from '../infrastructure/external-services/paymentIntents'
import { verifyStripeWebhook } from '../infrastructure/external-services/verifyStripeWebhook'
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
    // 月額の請求が払われた（初回も毎月も）。請求ごとにスレッドを作る
    case 'invoice.paid': {
      const invoice = event.data.object
      const details = invoice.parent?.subscription_details
      const purchaseId = details?.metadata?.['purchaseId']
      const subscriptionId =
        typeof details?.subscription === 'string'
          ? details.subscription
          : (details?.subscription?.id ?? null)
      if (!purchaseId || !subscriptionId || !invoice.id) return
      const paidAt = invoice.status_transitions.paid_at ?? event.created
      const result = await recordPayment(
        {
          purchaseId,
          stripeCustomerId: customerId(invoice.customer),
          subscription: { subscriptionId, invoiceId: invoice.id },
          paidAt: new Date(paidAt * 1000),
        },
        recordPaymentDeps
      )
      if (!result.ok) throw new Error(`申し込みが見つかりません: ${purchaseId}`)
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
