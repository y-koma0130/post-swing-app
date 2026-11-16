import 'server-only'
import { env } from 'cloudflare:workers'
import { getStripe } from '@/server/utils/stripeClient'

export type CreateBillingPortalSession = (stripeCustomerId: string) => Promise<string>

/** 生徒が月額の解約・カードの変更をする Stripe の画面 */
export const createBillingPortalSession: CreateBillingPortalSession = async (stripeCustomerId) => {
  const session = await getStripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    locale: 'ja',
    return_url: `${env.APP_URL}/me`,
  })
  return session.url
}
