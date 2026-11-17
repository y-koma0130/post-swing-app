import 'server-only'
import Stripe from 'stripe'
import { getStripe } from '@/server/utils/stripeClient'

/** カードの問題（残高不足・期限切れの仮押さえなど）。それ以外の失敗（通信など）は投げる */
const isCardProblem = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeCardError ||
  error instanceof Stripe.errors.StripeInvalidRequestError

export type CapturePaymentIntent = (
  paymentIntentId: string,
  idempotencyKey: string
) => Promise<boolean>

/**
 * 仮押さえした支払いを確定する。確定済みなら true（同じ承認が2回届いても1回だけ請求する）。
 * 仮押さえが切れているなど、確定できなければ false
 */
export const capturePaymentIntent: CapturePaymentIntent = async (
  paymentIntentId,
  idempotencyKey
) => {
  const stripe = getStripe()
  try {
    await stripe.paymentIntents.capture(paymentIntentId, {}, { idempotencyKey })
    return true
  } catch (error) {
    if (!isCardProblem(error)) throw error
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (intent.status === 'succeeded') return true
    console.error('[stripe] 支払いを確定できませんでした', paymentIntentId, intent.status)
    return false
  }
}

export type CancelPaymentIntent = (paymentIntentId: string) => Promise<boolean>

/** カードの仮押さえを外す。すでに外れていれば true、確定済みなど外せなければ false */
export const cancelPaymentIntent: CancelPaymentIntent = async (paymentIntentId) => {
  const stripe = getStripe()
  try {
    await stripe.paymentIntents.cancel(paymentIntentId)
    return true
  } catch (error) {
    if (!isCardProblem(error)) throw error
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (intent.status === 'canceled') return true
    console.error('[stripe] 仮押さえを外せませんでした', paymentIntentId, intent.status)
    return false
  }
}
