import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  findStripeAccountId: (userId: string) => Promise<string | null>
  fetchChargesEnabled: (stripeAccountId: string) => Promise<boolean>
  saveChargesEnabled: (stripeAccountId: string, chargesEnabled: boolean) => Promise<void>
}>

export type RefreshPayoutStatus = (
  params: Readonly<{ userId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ chargesEnabled: boolean }, 'not_found'>>

/**
 * Stripe に問い合わせて、コーチが決済を受けられる状態かを更新する
 * （口座の設定から戻ってきたとき。Webhook の account.updated でも同じ値が届く）
 */
export const refreshPayoutStatus: RefreshPayoutStatus = async ({ userId }, deps) => {
  const accountId = await deps.findStripeAccountId(userId)
  if (accountId === null) {
    return err('not_found')
  }
  const chargesEnabled = await deps.fetchChargesEnabled(accountId)
  await deps.saveChargesEnabled(accountId, chargesEnabled)
  return ok({ chargesEnabled })
}
