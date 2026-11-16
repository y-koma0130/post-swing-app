import { startThread } from '@/server/features/thread/domain/services/startThread.service'
import type { NewThread } from '@/server/features/thread/domain/values/Thread'
import { err, ok, type Result } from '@/server/utils/result'
import type { Purchase } from '../../domain/values/Purchase'

export type RecordPaymentParams = Readonly<{
  purchaseId: string
  stripeCustomerId: string | null
  /** 月額のときだけ。請求ごとにスレッドを1つ作る */
  subscription: Readonly<{ subscriptionId: string; invoiceId: string }> | null
  paidAt: Date
}>

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  markPurchasePaid: (
    purchaseId: string,
    payment: { stripeCustomerId: string | null; stripeSubscriptionId: string | null }
  ) => Promise<void>
  /** 都度払いは申し込み、月額は請求で、すでにスレッドがあるか */
  threadExists: (key: { purchaseId: string } | { invoiceId: string }) => Promise<boolean>
  createThread: (thread: NewThread) => Promise<void>
  /** コーチに「申し込みがありました」と知らせる（キューに積むだけ） */
  notifyThreadStarted: (input: { threadId: string; coachUserId: string }) => Promise<void>
  generateId: () => string
}>

export type RecordPayment = (
  params: RecordPaymentParams,
  dependencies: Dependencies
) => Promise<Result<{ threadCreated: boolean }, 'purchase_not_found'>>

/**
 * 支払いが済んだ（Stripe の Webhook から呼ぶ）。申し込みを支払い済みにし、スレッドを作る
 *
 * ドメインルール:
 * - 同じ支払いの通知が何度届いても、スレッドは1つだけ
 * - 都度払い（お試し・1スレッド）は申し込み1つにつきスレッド1つ
 * - 月額は請求1回につきスレッド1つ
 */
export const recordPayment: RecordPayment = async (params, deps) => {
  const purchase = await deps.findPurchase(params.purchaseId)
  if (!purchase) {
    return err('purchase_not_found')
  }

  if (purchase.status !== 'paid') {
    await deps.markPurchasePaid(purchase.id, {
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.subscription?.subscriptionId ?? null,
    })
  }

  const key = params.subscription
    ? { invoiceId: params.subscription.invoiceId }
    : { purchaseId: purchase.id }
  if (await deps.threadExists(key)) {
    return ok({ threadCreated: false })
  }

  const thread = startThread({
    id: deps.generateId(),
    purchaseId: purchase.id,
    coachUserId: purchase.coachUserId,
    studentUserId: purchase.studentUserId,
    planKind: purchase.planKind,
    paidAt: params.paidAt,
    stripeInvoiceId: params.subscription?.invoiceId ?? null,
  })
  await deps.createThread(thread)
  await deps.notifyThreadStarted({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok({ threadCreated: true })
}
