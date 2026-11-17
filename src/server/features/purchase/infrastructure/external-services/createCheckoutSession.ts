import 'server-only'
import { env } from 'cloudflare:workers'
import type Stripe from 'stripe'
import { getStripe } from '@/server/utils/stripeClient'
import type { CreateCheckoutSessionInput } from '../../application/usecases/startCheckout.usecase'
import { PURCHASE_RULES } from '../../domain/rules'

/** 承認制の申し込みの支払い画面を開いておく時間（Stripe の下限は30分） */
const CHECKOUT_EXPIRES_SECONDS = 60 * 60

export type CreateCheckoutSession = (
  input: CreateCheckoutSessionInput
) => Promise<{ sessionId: string; url: string }>

/**
 * Stripe Checkout を作る
 *
 * - 価格はその場で指定する（Stripe 側に商品・価格を作り置きしない）
 * - 支払いはプラットフォームが受け、手数料を引いてコーチの口座へ送る（destination charge）
 * - どの申し込みかは metadata.purchaseId で Webhook に伝える。月額は毎月の請求にも残るよう
 *   subscription_data.metadata にも入れる
 * - 承認制の申し込み（お試し・1スレッド）は、カードを仮押さえする（capture_method: manual）。
 *   コーチが承認したら確定し、断ったら外す。支払い画面は1時間で閉じる（下書きが消える前に終わらせる）
 */
export const createCheckoutSession: CreateCheckoutSession = async (input) => {
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    currency: 'jpy',
    unit_amount: input.priceYen,
    product_data: { name: input.productName },
    ...(input.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
  }
  const metadata = { purchaseId: input.purchaseId }
  const application = input.application
  const returnUrls = application
    ? {
        success_url: `${env.APP_URL}/t/${application.threadId}?applied=1`,
        cancel_url: `${env.APP_URL}/t/${application.threadId}`,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_SECONDS,
      }
    : {
        success_url: `${env.APP_URL}/me?checkout=success`,
        cancel_url: `${env.APP_URL}/c/${input.coachSlug}/apply`,
      }

  const session = await getStripe().checkout.sessions.create({
    mode: input.mode,
    locale: 'ja',
    client_reference_id: input.purchaseId,
    metadata,
    line_items: [{ quantity: 1, price_data: priceData }],
    ...(input.mode === 'payment'
      ? {
          customer_creation: 'always',
          payment_intent_data: {
            ...(application ? { capture_method: 'manual' as const } : {}),
            application_fee_amount: input.platformFeeYen,
            transfer_data: { destination: input.destinationAccountId },
            metadata,
          },
        }
      : {
          subscription_data: {
            application_fee_percent: PURCHASE_RULES.platformFeeRate * 100,
            transfer_data: { destination: input.destinationAccountId },
            metadata,
          },
        }),
    ...returnUrls,
  })
  if (!session.url) {
    throw new Error('Stripe Checkout の URL が返ってきませんでした')
  }
  return { sessionId: session.id, url: session.url }
}
