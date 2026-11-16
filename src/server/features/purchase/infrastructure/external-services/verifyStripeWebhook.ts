import 'server-only'
import { env } from 'cloudflare:workers'
import type Stripe from 'stripe'
import { getStripe, stripeCryptoProvider } from '@/server/utils/stripeClient'

export type VerifyStripeWebhook = (body: string, signature: string) => Promise<Stripe.Event | null>

/**
 * Stripe の Webhook の署名を確かめ、イベントを取り出す。正しくなければ null
 *
 * 自分のアカウントのイベントと Connect（コーチの口座）のイベントは、Stripe では別のエンドポイント設定になり
 * 署名のシークレットも別になる。同じ URL で受けるので、両方のシークレットで試す
 */
export const verifyStripeWebhook: VerifyStripeWebhook = async (body, signature) => {
  const secrets = [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (secret) => secret !== undefined && secret !== ''
  )
  for (const secret of secrets) {
    try {
      return await getStripe().webhooks.constructEventAsync(
        body,
        signature,
        secret,
        undefined,
        stripeCryptoProvider
      )
    } catch {
      // 次のシークレットで試す
    }
  }
  return null
}
