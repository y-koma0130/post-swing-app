import { err, ok, type Result } from '@/server/utils/result'
import type { Purchase } from '../values/Purchase'

export type RefundBlocker = 'already_refunded' | 'not_paid' | 'no_stripe_payment'

/** 返金する Stripe の支払い。月額は請求、都度払いは申し込みの Checkout */
export type RefundSource =
  | Readonly<{ kind: 'invoice'; invoiceId: string }>
  | Readonly<{ kind: 'checkout_session'; checkoutSessionId: string }>

export type CheckRefund = (
  input: Readonly<{
    purchase: Pick<Purchase, 'status'> & { stripeCheckoutSessionId: string | null }
    thread: Readonly<{ stripeInvoiceId: string | null; refunded: boolean }>
  }>
) => Result<RefundSource, RefundBlocker>

/**
 * スレッドの支払いを返金できるか。できるなら、返金する支払いを返す
 *
 * ドメインルール:
 * - 返金はスレッド単位（月額は、そのスレッドを作った請求だけを返す）
 * - 同じスレッドは1回だけ
 * - 支払いが済んでいない申し込み（仮押さえ・取り消しを含む）は返金しない（解約した月額は、払った分を返せる）
 * - Stripe を通っていない支払い（開発用の購入）は返金できない
 */
export const checkRefund: CheckRefund = ({ purchase, thread }) => {
  if (thread.refunded) return err('already_refunded')
  if (purchase.status !== 'paid' && purchase.status !== 'canceled') return err('not_paid')
  if (thread.stripeInvoiceId) return ok({ kind: 'invoice', invoiceId: thread.stripeInvoiceId })
  if (purchase.stripeCheckoutSessionId) {
    return ok({ kind: 'checkout_session', checkoutSessionId: purchase.stripeCheckoutSessionId })
  }
  return err('no_stripe_payment')
}
