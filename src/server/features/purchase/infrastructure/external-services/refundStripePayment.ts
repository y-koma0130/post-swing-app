import 'server-only'
import { getStripe } from '@/server/utils/stripeClient'
import type { RefundSource } from '../../domain/services/checkRefund.service'

/** 返金する支払い（PaymentIntent）を探す */
const findPaymentIntentId = async (source: RefundSource): Promise<string | null> => {
  const stripe = getStripe()
  if (source.kind === 'checkout_session') {
    const session = await stripe.checkout.sessions.retrieve(source.checkoutSessionId)
    const intent = session.payment_intent
    return typeof intent === 'string' ? intent : (intent?.id ?? null)
  }
  const payments = await stripe.invoicePayments.list({ invoice: source.invoiceId, limit: 10 })
  const paid = payments.data.find((p) => p.status === 'paid' && p.payment.type === 'payment_intent')
  const intent = paid?.payment.payment_intent
  return typeof intent === 'string' ? intent : (intent?.id ?? null)
}

export type RefundStripePayment = (
  source: RefundSource,
  idempotencyKey: string
) => Promise<{ refundId: string }>

/**
 * Stripe で全額を返金する
 *
 * destination charge なので、コーチへ送った分は取り戻し（reverse_transfer）、
 * プラットフォームの手数料も生徒へ返す（refund_application_fee）。
 * 同じスレッドを2回返金しないよう、冪等キーを付ける
 */
export const refundStripePayment: RefundStripePayment = async (source, idempotencyKey) => {
  const paymentIntentId = await findPaymentIntentId(source)
  if (!paymentIntentId) {
    throw new Error('返金する支払いが Stripe に見つかりません')
  }
  const refund = await getStripe().refunds.create(
    { payment_intent: paymentIntentId, reverse_transfer: true, refund_application_fee: true },
    { idempotencyKey }
  )
  return { refundId: refund.id }
}
