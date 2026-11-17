import 'server-only'
import Stripe from 'stripe'
import { getStripe } from '@/server/utils/stripeClient'
import type { StartSubscriptionInput } from '../../application/usecases/capturePurchase.usecase'
import { PURCHASE_RULES } from '../../domain/rules'

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

const idOf = (value: string | { id: string } | null): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null)

export type StartSubscription = (
  input: StartSubscriptionInput
) => Promise<{ subscriptionId: string }>

/**
 * 月額のサブスクリプションを、初月の支払いのカードで始める
 *
 * - 初月は承認のときに確定済みなので、2回目の請求日（firstRenewalAt）までを無料期間（trial_end）にする。
 *   無料期間の0円の請求書は、Webhook でスレッドを作らない
 * - 送金先と手数料は初月と同じ（destination charge）。毎月の請求に申し込みの ID を残す（metadata）
 * - 同じ申し込みで2つ作らないよう、冪等キーを付ける
 */
export const startSubscription: StartSubscription = async (input) => {
  const stripe = getStripe()
  const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId)
  const customer = idOf(intent.customer)
  const paymentMethod = idOf(intent.payment_method)
  const destination = idOf(intent.transfer_data?.destination ?? null)
  if (!customer || !paymentMethod || !destination) {
    throw new Error(`初月の支払いから顧客・カード・送金先が分かりません: ${input.paymentIntentId}`)
  }
  const product = await stripe.products.create(
    { name: intent.description ?? '月額', metadata: { purchaseId: input.purchaseId } },
    { idempotencyKey: `product-${input.purchaseId}` }
  )
  const subscription = await stripe.subscriptions.create(
    {
      customer,
      default_payment_method: paymentMethod,
      items: [
        {
          price_data: {
            currency: 'jpy',
            product: product.id,
            unit_amount: input.priceYen,
            recurring: { interval: 'month' },
          },
        },
      ],
      trial_end: Math.floor(input.firstRenewalAt.getTime() / 1000),
      application_fee_percent: PURCHASE_RULES.platformFeeRate * 100,
      transfer_data: { destination },
      metadata: { purchaseId: input.purchaseId },
    },
    { idempotencyKey: `subscription-${input.purchaseId}` }
  )
  return { subscriptionId: subscription.id }
}
