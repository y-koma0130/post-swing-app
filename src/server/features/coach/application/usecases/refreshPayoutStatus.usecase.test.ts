import { describe, expect, it, vi } from 'vitest'
import { refreshPayoutStatus } from './refreshPayoutStatus.usecase'

type Deps = Parameters<typeof refreshPayoutStatus>[1]

const setup = (accountId: string | null, enabled: boolean) => {
  const saveChargesEnabled = vi.fn<Deps['saveChargesEnabled']>(async () => undefined)
  const fetchChargesEnabled = vi.fn<Deps['fetchChargesEnabled']>(async () => enabled)
  const deps: Deps = {
    findStripeAccountId: async () => accountId,
    fetchChargesEnabled,
    saveChargesEnabled,
  }
  return { deps, saveChargesEnabled, fetchChargesEnabled }
}

describe('refreshPayoutStatus', () => {
  it('Stripe の状態を問い合わせて保存する', async () => {
    const { deps, saveChargesEnabled } = setup('acct_1', true)
    expect(await refreshPayoutStatus({ userId: 'coach-1' }, deps)).toEqual({
      ok: true,
      value: { chargesEnabled: true },
    })
    expect(saveChargesEnabled).toHaveBeenCalledWith('acct_1', true)
  })

  it('口座をまだ作っていなければ、Stripe に問い合わせない', async () => {
    const { deps, fetchChargesEnabled } = setup(null, true)
    expect(await refreshPayoutStatus({ userId: 'coach-1' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(fetchChargesEnabled).not.toHaveBeenCalled()
  })
})
