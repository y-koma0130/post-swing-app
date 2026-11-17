import 'server-only'
import { env } from 'cloudflare:workers'
import { getStripe } from '@/server/utils/stripeClient'
import type { CreateCheckoutSessionInput } from '../../application/usecases/startApplicationCheckout.usecase'

/** 申し込みの支払い画面を開いておく時間（Stripe の下限は30分）。下書きが消える前に終わらせる */
const CHECKOUT_EXPIRES_SECONDS = 60 * 60

export type CreateCheckoutSession = (
  input: CreateCheckoutSessionInput
) => Promise<{ sessionId: string; url: string }>

/**
 * 申し込みの支払い画面（Stripe Checkout）を作る
 *
 * - カードを仮押さえする（capture_method: manual）。コーチが承認したら確定し、断ったら外す
 * - 価格はその場で指定する（Stripe 側に商品・価格を作り置きしない）
 * - 支払いはプラットフォームが受け、手数料を引いてコーチの口座へ送る（destination charge）
 * - どの申し込みかは metadata.purchaseId で Webhook に伝える
 * - 月額は初月をこの支払いで受け、カードを保存しておく（承認したときに、そのカードでサブスクリプションを始める）。
 *   サブスクリプションの商品名に使うので、商品名を支払いの説明にも入れる
 */
export const createCheckoutSession: CreateCheckoutSession = async (input) => {
  const metadata = { purchaseId: input.purchaseId }
  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'ja',
    client_reference_id: input.purchaseId,
    metadata,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'jpy',
          unit_amount: input.priceYen,
          product_data: { name: input.productName },
        },
      },
    ],
    customer_creation: 'always',
    payment_intent_data: {
      capture_method: 'manual',
      application_fee_amount: input.platformFeeYen,
      transfer_data: { destination: input.destinationAccountId },
      description: input.productName,
      metadata,
      ...(input.saveCardForRenewal ? { setup_future_usage: 'off_session' as const } : {}),
    },
    success_url: `${env.APP_URL}/t/${input.threadId}?applied=1`,
    cancel_url: `${env.APP_URL}/t/${input.threadId}`,
    expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_SECONDS,
  })
  if (!session.url) {
    throw new Error('Stripe Checkout の URL が返ってきませんでした')
  }
  return { sessionId: session.id, url: session.url }
}
