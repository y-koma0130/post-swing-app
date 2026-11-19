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

/**
 * Stripe の審査に使う、コーチのサービスの説明（外には出ない）。どのコーチも同じ。
 * 何を・誰に・どう請求して売るかを書く（Stripe の推奨）
 */
const PRODUCT_DESCRIPTION =
  'ゴルフのコーチとして、SwingPost（swingpost.app）を通じて、生徒から送られたスイング動画にオンラインで添削（コメントと画像）を返す。料金は1回ごと、または月額で、生徒がカードで支払う。'

/**
 * 受付ページの URL。Stripe は localhost などの URL を受け付けないので、https のときだけ渡す
 * （渡さなければ、コーチが本人確認の画面で入力する）
 */
const businessUrlOf = (slug: string): string | undefined => {
  const url = `${env.APP_URL}/c/${slug}`
  return url.startsWith('https://') ? url : undefined
}

/**
 * 口座のビジネスの情報（Webサイト・屋号・サービスの説明）。本人確認の画面で入力済みになり、
 * コーチがビジネスの説明を書かなくて済む
 */
const profileOf = (slug: string, displayName: string) => {
  const businessUrl = businessUrlOf(slug)
  return {
    product_description: PRODUCT_DESCRIPTION,
    doing_business_as: displayName,
    ...(businessUrl ? { business_url: businessUrl } : {}),
  }
}

export type CreateConnectAccount = (input: ConnectAccountInput) => Promise<string>
export const createConnectAccount: CreateConnectAccount = async ({
  userId,
  email,
  slug,
  displayName,
}) => {
  const account = await getStripe().v2.core.accounts.create({
    contact_email: email,
    identity: { country: 'JP' },
    // コーチが売上・入金を確かめる画面（Express ダッシュボード）
    dashboard: 'express',
    defaults: {
      responsibilities: { fees_collector: 'application', losses_collector: 'application' },
      profile: profileOf(slug, displayName),
    },
    configuration: {
      recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
    },
    metadata: { userId },
  })
  return account.id
}

/**
 * 口座のビジネスの情報を、いまの受付ページと活動名に合わせる（プロフィールを保存したとき）。
 * スラッグを変えると古い URL は 404 になり、Stripe の定期的なWebサイトの確認でひっかかるため。
 * 失敗してもプロフィールの保存は止めない（ログに残し、次に保存したときに合わせ直す）
 */
export type SyncConnectProfile = (input: {
  stripeAccountId: string
  slug: string
  displayName: string
}) => Promise<void>
export const syncConnectProfile: SyncConnectProfile = async ({
  stripeAccountId,
  slug,
  displayName,
}) => {
  try {
    await getStripe().v2.core.accounts.update(stripeAccountId, {
      defaults: { profile: profileOf(slug, displayName) },
    })
  } catch (error) {
    console.error('[stripe] 口座のビジネスの情報の更新に失敗しました', error)
  }
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
