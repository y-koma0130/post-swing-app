import 'server-only'
import { env } from 'cloudflare:workers'
import type Stripe from 'stripe'
import { getStripe } from '@/server/utils/stripeClient'
import type { ConnectAccountInput } from '../../application/usecases/startPayoutOnboarding.usecase'

/**
 * コーチの売上の受け取り口座（Stripe Connect、Accounts v2）
 *
 * 支払いはプラットフォーム（SwingPost）が受け、手数料を引いた残りをコーチへ送る
 * （destination charge、on_behalf_of なし）。プラットフォームが販売者になるので、コーチの口座に要るのは
 * 送金を受け取る recipient の設定だけ。手数料と、返金・不正の損失もプラットフォームが持つ
 *
 * 新しい Connect の組み込みでは Accounts v1（POST /v1/accounts）は使えない
 */

/** Stripe の審査に使う、コーチのサービスの説明（外には出ない）。どのコーチも同じ */
const PRODUCT_DESCRIPTION = 'SwingPost を通じた、ゴルフのスイング動画のオンライン添削'

/**
 * 受付ページの URL。Stripe は localhost などの URL を受け付けないので、https のときだけ渡す
 * （渡さなければ、コーチが本人確認の画面で入力する）
 */
const businessUrlOf = (slug: string): string | undefined => {
  const url = `${env.APP_URL}/c/${slug}`
  return url.startsWith('https://') ? url : undefined
}

export type CreateConnectAccount = (input: ConnectAccountInput) => Promise<string>
export const createConnectAccount: CreateConnectAccount = async ({
  userId,
  email,
  slug,
  displayName,
}) => {
  const businessUrl = businessUrlOf(slug)
  const account = await getStripe().v2.core.accounts.create({
    contact_email: email,
    identity: { country: 'JP' },
    // コーチが売上・入金を確かめる画面（Express ダッシュボード）
    dashboard: 'express',
    defaults: {
      responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      // 本人確認の画面で、ビジネスの情報を入力済みにする（コーチがビジネスの説明を書かなくて済む）
      profile: {
        product_description: PRODUCT_DESCRIPTION,
        doing_business_as: displayName,
        ...(businessUrl ? { business_url: businessUrl } : {}),
      },
    },
    configuration: {
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    metadata: { userId },
  })
  return account.id
}

export type CreateOnboardingLink = (stripeAccountId: string) => Promise<string>
export const createOnboardingLink: CreateOnboardingLink = async (stripeAccountId) => {
  const link = await getStripe().v2.core.accountLinks.create({
    account: stripeAccountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        // リンクの期限が切れたときは、設定画面からもう一度始めてもらう
        refresh_url: `${env.APP_URL}/coach/settings`,
        return_url: `${env.APP_URL}/coach/settings/payout-return`,
      },
    },
  })
  return link.url
}

/** 送金を受け取れる状態か（recipient の stripe_transfers が active） */
const canReceiveTransfers = (account: Stripe.V2.Core.Account): boolean =>
  account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ===
  'active'

export type FetchChargesEnabled = (stripeAccountId: string) => Promise<boolean>
export const fetchChargesEnabled: FetchChargesEnabled = async (stripeAccountId) => {
  const account = await getStripe().v2.core.accounts.retrieve(stripeAccountId, {
    include: ['configuration.recipient'],
  })
  return canReceiveTransfers(account)
}

/** コーチが売上・入金を確かめる Stripe の画面 */
export type CreateDashboardLink = (stripeAccountId: string) => Promise<string>
export const createDashboardLink: CreateDashboardLink = async (stripeAccountId) => {
  const link = await getStripe().accounts.createLoginLink(stripeAccountId)
  return link.url
}
