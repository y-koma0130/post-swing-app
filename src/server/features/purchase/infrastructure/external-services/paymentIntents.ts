import 'server-only'
import Stripe from 'stripe'
import { logWarn } from '@/server/utils/logger'
import { getStripe } from '@/server/utils/stripeClient'
import type { StartSubscriptionInput } from '../../application/usecases/capturePurchase.usecase'
import { calcSubscriptionFeePercent } from '../../domain/services/calcCharge.service'
import { SYSTEM_FEE_NAME } from './createCheckoutSession'

/** カードの問題（残高不足・期限切れの仮押さえなど）。それ以外の失敗（通信など）は投げる */
const isCardProblem = (error: unknown): boolean =>
  error instanceof Stripe.errors.StripeCardError ||
  error instanceof Stripe.errors.StripeInvalidRequestError

export type CapturePaymentIntent = (
  input: Readonly<{ paymentIntentId: string; applicationFeeYen: number; idempotencyKey: string }>
) => Promise<boolean>

/**
 * 仮押さえした支払いを、この手数料（Application Fee）で確定する。確定済みなら true
 * （同じ承認が2回届いても1回だけ請求する）。仮押さえが切れているなど、確定できなければ false
 */
export const capturePaymentIntent: CapturePaymentIntent = async ({
  paymentIntentId,
  applicationFeeYen,
  idempotencyKey,
}) => {
  const stripe = getStripe()
  try {
    await stripe.paymentIntents.capture(
      paymentIntentId,
      { application_fee_amount: applicationFeeYen },
      { idempotencyKey }
    )
    return true
  } catch (error) {
    if (!isCardProblem(error)) throw error
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
    if (intent.status === 'succeeded') return true
    logWarn(
      'stripe',
      '支払いを確定できませんでした',
      { ids: { paymentIntentId }, kind: intent.status },
      error
    )
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
    logWarn(
      'stripe',
      '仮押さえを外せませんでした',
      { ids: { paymentIntentId }, kind: intent.status },
      error
    )
    return false
  }
}

const idOf = (value: string | { id: string } | null): string | null =>
  typeof value === 'string' ? value : (value?.id ?? null)

/** システム利用料の商品（Stripe）。すべての月額で共有する */
const SYSTEM_FEE_PRODUCT_ID = 'swingpost_system_fee'

/** システム利用料の商品を用意する（なければ作る） */
const ensureSystemFeeProduct = async (): Promise<string> => {
  const stripe = getStripe()
  try {
    return (await stripe.products.retrieve(SYSTEM_FEE_PRODUCT_ID)).id
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) throw error
    const created = await stripe.products.create(
      { id: SYSTEM_FEE_PRODUCT_ID, name: SYSTEM_FEE_NAME },
      { idempotencyKey: `product-${SYSTEM_FEE_PRODUCT_ID}` }
    )
    return created.id
  }
}

const monthlyPrice = (product: string, unitAmount: number) => ({
  currency: 'jpy',
  product,
  unit_amount: unitAmount,
  recurring: { interval: 'month' as const },
})

export type StartSubscription = (
  input: StartSubscriptionInput
) => Promise<{ subscriptionId: string }>

/**
 * 月額のサブスクリプションを、初月の支払いのカードで始める
 *
 * - 初月は承認のときに確定済みなので、2回目の請求日（firstRenewalAt）までを無料期間（trial_end）にする。
 *   無料期間の0円の請求書は、Webhook でスレッドを作らない
 * - 毎月の請求は、価格とシステム利用料の2行。送金先は初月と同じ（destination charge）で、
 *   手数料は割合で指定する（calcSubscriptionFeePercent）。毎月の請求に申し込みの ID を残す（metadata）
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
    {
      name: (intent.description ?? '月額').replace('（初月）', ''),
      metadata: { purchaseId: input.purchaseId },
    },
    { idempotencyKey: `product-${input.purchaseId}` }
  )
  const feeItems =
    input.systemFeeYen > 0
      ? [{ price_data: monthlyPrice(await ensureSystemFeeProduct(), input.systemFeeYen) }]
      : []
  const subscription = await stripe.subscriptions.create(
    {
      customer,
      default_payment_method: paymentMethod,
      items: [{ price_data: monthlyPrice(product.id, input.priceYen) }, ...feeItems],
      trial_end: Math.floor(input.firstRenewalAt.getTime() / 1000),
      application_fee_percent: calcSubscriptionFeePercent(input),
      transfer_data: { destination },
      metadata: { purchaseId: input.purchaseId },
    },
    { idempotencyKey: `subscription-${input.purchaseId}` }
  )
  return { subscriptionId: subscription.id }
}

export type ChangeSubscriptionPrice = (
  input: Readonly<{
    subscriptionId: string
    priceYen: number
    systemFeeYen: number
    platformFeeRate: number
  }>
) => Promise<void>

/**
 * 月額の価格とシステム利用料を変える（次の請求から。日割りはしない）。
 * 手数料の割合も新しい価格に合わせる
 */
export const changeSubscriptionPrice: ChangeSubscriptionPrice = async (input) => {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId)
  const planItem = subscription.items.data.find(
    (item) => idOf(item.price.product) !== SYSTEM_FEE_PRODUCT_ID
  )
  const feeItem = subscription.items.data.find(
    (item) => idOf(item.price.product) === SYSTEM_FEE_PRODUCT_ID
  )
  const product = planItem ? idOf(planItem.price.product) : null
  if (!planItem || !product) {
    throw new Error(`月額の価格の行が見つかりません: ${input.subscriptionId}`)
  }
  // システム利用料の行は、金額が変わるときだけ差し替える（以前の0円の申し込みには行がない）
  const feeItems =
    feeItem && feeItem.price.unit_amount !== input.systemFeeYen
      ? [{ id: feeItem.id, price_data: monthlyPrice(SYSTEM_FEE_PRODUCT_ID, input.systemFeeYen) }]
      : []
  await stripe.subscriptions.update(input.subscriptionId, {
    items: [{ id: planItem.id, price_data: monthlyPrice(product, input.priceYen) }, ...feeItems],
    application_fee_percent: calcSubscriptionFeePercent(input),
    proration_behavior: 'none',
  })
}

export type SetInvoiceApplicationFee = (
  invoiceId: string,
  applicationFeeYen: number
) => Promise<void>

/**
 * 下書きの請求書（月額の毎月の請求）の手数料を入れ直す。確定のあとでは変えられない（Stripe）
 */
export const setInvoiceApplicationFee: SetInvoiceApplicationFee = async (
  invoiceId,
  applicationFeeYen
) => {
  await getStripe().invoices.update(invoiceId, { application_fee_amount: applicationFeeYen })
}

export type FindInvoiceApplicationFee = (
  invoiceId: string
) => Promise<{ applicationFeeId: string; amountYen: number; paymentIntentId: string } | null>

/** 支払われた請求書で、実際に取った Application Fee（請求書の支払い → 決済 → 手数料をたどる） */
export const findInvoiceApplicationFee: FindInvoiceApplicationFee = async (invoiceId) => {
  const stripe = getStripe()
  const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 10 })
  const paid = payments.data.find((p) => p.status === 'paid' && p.payment.type === 'payment_intent')
  const intentId = idOf(paid?.payment.payment_intent ?? null)
  if (!intentId) return null
  const intent = await stripe.paymentIntents.retrieve(intentId, {
    expand: ['latest_charge.application_fee'],
  })
  const charge = intent.latest_charge
  if (!charge || typeof charge === 'string') return null
  const fee = charge.application_fee
  if (!fee || typeof fee === 'string') return null
  return { applicationFeeId: fee.id, amountYen: fee.amount, paymentIntentId: intentId }
}

export type RefundApplicationFee = (
  input: Readonly<{ applicationFeeId: string; amountYen: number; idempotencyKey: string }>
) => Promise<void>

/** Application Fee の一部をコーチの口座へ戻す（手数料を多く取っていたときの差額） */
export const refundApplicationFee: RefundApplicationFee = async ({
  applicationFeeId,
  amountYen,
  idempotencyKey,
}) => {
  await getStripe().applicationFees.createRefund(
    applicationFeeId,
    { amount: amountYen },
    { idempotencyKey }
  )
}
