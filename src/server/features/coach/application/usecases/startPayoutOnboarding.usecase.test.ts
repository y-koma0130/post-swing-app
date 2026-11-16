import { describe, expect, it, vi } from 'vitest'
import { startPayoutOnboarding } from './startPayoutOnboarding.usecase'

type Deps = Parameters<typeof startPayoutOnboarding>[1]
const actor = { userId: 'coach-1', name: '山田' }

const setup = (stripeAccountId: string | null) => {
  const createConnectAccount = vi.fn<Deps['createConnectAccount']>(async () => 'acct_new')
  const saveStripeAccountId = vi.fn<Deps['saveStripeAccountId']>(async () => undefined)
  const deps: Deps = {
    findPayoutAccount: async () => ({ stripeAccountId, email: 'coach@example.com' }),
    createConnectAccount,
    saveStripeAccountId,
    createOnboardingLink: async (id) => `https://connect.stripe.com/setup/${id}`,
  }
  return { deps, createConnectAccount, saveStripeAccountId }
}

describe('startPayoutOnboarding', () => {
  it('口座がなければ作って保存し、設定画面のURLを返す', async () => {
    const { deps, createConnectAccount, saveStripeAccountId } = setup(null)
    const result = await startPayoutOnboarding({ actor }, deps)
    expect(result).toEqual({
      ok: true,
      value: { url: 'https://connect.stripe.com/setup/acct_new' },
    })
    expect(createConnectAccount).toHaveBeenCalledOnce()
    expect(saveStripeAccountId).toHaveBeenCalledWith('coach-1', 'acct_new')
  })

  it('口座があれば作らず、続きから始める', async () => {
    const { deps, createConnectAccount } = setup('acct_existing')
    const result = await startPayoutOnboarding({ actor }, deps)
    expect(result).toEqual({
      ok: true,
      value: { url: 'https://connect.stripe.com/setup/acct_existing' },
    })
    expect(createConnectAccount).not.toHaveBeenCalled()
  })

  it('コーチでなければ not_found', async () => {
    const { deps } = setup(null)
    const result = await startPayoutOnboarding(
      { actor },
      { ...deps, findPayoutAccount: async () => null }
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })
})
