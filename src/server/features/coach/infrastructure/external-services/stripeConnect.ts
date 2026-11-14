import 'server-only'
import { env } from 'cloudflare:workers'
import { getStripe } from '@/server/utils/stripeClient'

/**
 * コーチの売上の受け取り口座（Stripe Connect Express）
 * 手数料はプラットフォームが受け取り、残りをコーチの口座へ送る（destination charge）
 */

export type CreateConnectAccount = (input: { userId: string; email: string }) => Promise<string>
export const createConnectAccount: CreateConnectAccount = async ({ userId, email }) => {
  const account = await getStripe().accounts.create({
    type: 'express',
    country: 'JP',
    email,
    business_type: 'individual',
    capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
    metadata: { userId },
  })
  return account.id
}

export type CreateOnboardingLink = (stripeAccountId: string) => Promise<string>
export const createOnboardingLink: CreateOnboardingLink = async (stripeAccountId) => {
  const link = await getStripe().accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    // リンクの期限が切れたときは、設定画面からもう一度始めてもらう
    refresh_url: `${env.APP_URL}/coach/settings`,
    return_url: `${env.APP_URL}/coach/settings/payout-return`,
  })
  return link.url
}

export type FetchChargesEnabled = (stripeAccountId: string) => Promise<boolean>
export const fetchChargesEnabled: FetchChargesEnabled = async (stripeAccountId) => {
  const account = await getStripe().accounts.retrieve(stripeAccountId)
  return account.charges_enabled
}

/** コーチが売上・入金を確かめる Stripe の画面 */
export type CreateDashboardLink = (stripeAccountId: string) => Promise<string>
export const createDashboardLink: CreateDashboardLink = async (stripeAccountId) => {
  const link = await getStripe().accounts.createLoginLink(stripeAccountId)
  return link.url
}
