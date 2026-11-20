import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

/**
 * 口座を作るときに渡す情報。受付ページと活動名は、Stripe の本人確認でビジネスの情報
 * （Webサイト・屋号）として入力済みにして、コーチが自分で書かなくて済むようにする
 */
export type ConnectAccountInput = Readonly<{
  userId: string
  email: string
  slug: string
  displayName: string
}>

type Dependencies = Readonly<{
  findPayoutAccount: (userId: string) => Promise<{
    stripeAccountId: string | null
    email: string
    slug: string
    displayName: string
  } | null>
  createConnectAccount: (input: ConnectAccountInput) => Promise<string>
  saveStripeAccountId: (userId: string, stripeAccountId: string) => Promise<void>
  createOnboardingLink: (stripeAccountId: string) => Promise<string>
  /** デモのコーチか（demo が持つ） */
  isDemoCoach: (userId: string) => Promise<boolean>
}>

export type StartPayoutOnboarding = (
  params: Readonly<{ actor: Actor }>,
  dependencies: Dependencies
) => Promise<Result<{ url: string }, 'not_found' | 'demo_coach'>>

/**
 * コーチが売上を受け取る口座（Stripe Connect Express）を開設・設定する画面へ進む
 *
 * 口座がまだなければ作る（受付ページと活動名を、ビジネスの情報として入力済みにする）。
 * 途中でやめても、次は同じ口座の続きから始まる。
 * デモのコーチ（staging でコーチ候補が試すもの）は、Stripe に口座を作らない
 */
export const startPayoutOnboarding: StartPayoutOnboarding = async ({ actor }, deps) => {
  const coach = await deps.findPayoutAccount(actor.userId)
  if (!coach) {
    return err('not_found')
  }
  if (await deps.isDemoCoach(actor.userId)) {
    return err('demo_coach')
  }
  let accountId = coach.stripeAccountId
  if (accountId === null) {
    accountId = await deps.createConnectAccount({
      userId: actor.userId,
      email: coach.email,
      slug: coach.slug,
      displayName: coach.displayName,
    })
    await deps.saveStripeAccountId(actor.userId, accountId)
  }
  return ok({ url: await deps.createOnboardingLink(accountId) })
}
