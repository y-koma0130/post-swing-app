import { err, ok, type Result } from '@/server/utils/result'
import {
  checkRefund,
  type RefundBlocker,
  type RefundSource,
} from '../../domain/services/checkRefund.service'
import type { Purchase } from '../../domain/values/Purchase'

type Dependencies = Readonly<{
  /** スレッドを作った支払い（thread が持つ） */
  findThreadPayment: (threadId: string) => Promise<{
    purchaseId: string
    stripeInvoiceId: string | null
    refunded: boolean
  } | null>
  findPurchaseForRefund: (
    purchaseId: string
  ) => Promise<(Purchase & { stripeCheckoutSessionId: string | null }) | null>
  refundStripePayment: (
    source: RefundSource,
    idempotencyKey: string
  ) => Promise<{ refundId: string }>
  /** 返金したスレッドを終了する（thread が持つ） */
  markThreadRefunded: (threadId: string, refundedAt: Date) => Promise<void>
}>

export type RefundThread = (
  params: Readonly<{ threadId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ refundId: string }, 'not_found' | RefundBlocker>>

/**
 * 管理者がスレッドの支払いを返金し、スレッドを終了する（管理者かどうかは呼び出し側で確かめる。返金できるかは checkRefund で決める）
 */
export const refundThread: RefundThread = async ({ threadId, now }, deps) => {
  const payment = await deps.findThreadPayment(threadId)
  const purchase = payment ? await deps.findPurchaseForRefund(payment.purchaseId) : null
  if (!payment || !purchase) {
    return err('not_found')
  }
  const source = checkRefund({ purchase, thread: payment })
  if (!source.ok) {
    return err(source.error)
  }
  // Stripe の返金が済んでから記録する。記録で失敗しても、やり直せば冪等キーで同じ返金になる
  const { refundId } = await deps.refundStripePayment(source.value, `refund-thread-${threadId}`)
  await deps.markThreadRefunded(threadId, now)
  return ok({ refundId })
}
