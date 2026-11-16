import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { type CheckoutCoach, startCheckout } from './startCheckout.usecase'

type Deps = Parameters<typeof startCheckout>[1]

const actor = { userId: 'student-1', name: '佐藤' }
const base = { actor, acknowledgedDelay: false, now: new Date('2026-11-16T00:00:00Z') }

const coach: CheckoutCoach = {
  userId: 'coach-1',
  name: '山田 太郎',
  stripeAccountId: 'acct_123',
  chargesEnabled: true,
  suspended: false,
  monthlyCapacity: 2,
  plans: [
    { kind: 'trial', name: 'お試し', priceYen: 550, active: true },
    { kind: 'single', name: '1スレッド', priceYen: 4980, active: false },
    { kind: 'monthly', name: '月額', priceYen: 3980, active: true },
  ],
}

const setup = (overrides: Partial<Omit<Deps, 'createCheckoutSession'>> = {}) => {
  const createCheckoutSession = vi.fn<Deps['createCheckoutSession']>(async () => ({
    sessionId: 'cs_1',
    url: 'https://checkout.stripe.com/c/cs_1',
  }))
  const deps: Deps = {
    findCoachForCheckout: async () => coach,
    countActiveThreads: async () => 0,
    hasPaidTrial: async () => false,
    hasActiveSubscription: async () => false,
    findCoachAvailability: async () => ({ kind: 'available', replyTargetHours: 48 }),
    savePendingPurchase: async () => undefined,
    attachCheckoutSession: async () => undefined,
    generateId: () => 'purchase-1',
    ...overrides,
    createCheckoutSession,
  }
  return { deps, createCheckoutSession }
}

describe('startCheckout', () => {
  it('都度払いは payment、手数料は10%で Checkout を作る', async () => {
    const { deps, createCheckoutSession } = setup()
    const result = await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, deps)
    expect(result).toEqual({ ok: true, value: { url: 'https://checkout.stripe.com/c/cs_1' } })
    expect(createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      purchaseId: 'purchase-1',
      mode: 'payment',
      priceYen: 550,
      platformFeeYen: 55,
      destinationAccountId: 'acct_123',
    })
  })

  it('月額は subscription で作る', async () => {
    const { deps, createCheckoutSession } = setup()
    await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'monthly' }, deps)
    expect(createCheckoutSession.mock.calls[0]?.[0].mode).toBe('subscription')
  })

  it('受付を止めているプランは申し込めない', async () => {
    const { deps } = setup()
    expect(await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'single' }, deps)).toEqual(
      {
        ok: false,
        error: 'not_accepting',
      }
    )
  })

  it('コーチが決済を受けられないと申し込めない', async () => {
    const { deps } = setup({
      findCoachForCheckout: async () => ({ ...coach, chargesEnabled: false }),
    })
    expect(await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, deps)).toEqual({
      ok: false,
      error: 'not_accepting',
    })
  })

  it('満枠なら申し込めない', async () => {
    const { deps, createCheckoutSession } = setup({ countActiveThreads: async () => 2 })
    expect(await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, deps)).toEqual({
      ok: false,
      error: 'full',
    })
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('お試しは同じコーチに1回まで', async () => {
    const { deps } = setup({ hasPaidTrial: async () => true })
    expect(await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, deps)).toEqual({
      ok: false,
      error: 'trial_used',
    })
  })

  it('月額の2重申し込みはできない', async () => {
    const { deps } = setup({ hasActiveSubscription: async () => true })
    expect(
      await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'monthly' }, deps)
    ).toEqual({
      ok: false,
      error: 'already_subscribed',
    })
  })

  it('コーチ本人は自分に申し込めない', async () => {
    const { deps } = setup()
    expect(
      await startCheckout(
        {
          ...base,
          actor: { userId: 'coach-1', name: '山田' },
          coachSlug: 'yamada',
          planKind: 'trial',
        },
        deps
      )
    ).toEqual({ ok: false, error: 'own_coach' })
  })

  it('不在で新規を止めているコーチには申し込めない。了承が要るときは了承して申し込める', async () => {
    const absence = {
      id: 'a1',
      coachUserId: 'coach-1',
      startDate: localDateSchema.parse('2026-11-15'),
      endDate: localDateSchema.parse('2026-11-20'),
      note: '',
      pauseNewSignups: true,
    }
    const resumeDate = localDateSchema.parse('2026-11-21')
    const paused = setup({
      findCoachAvailability: async () => ({ kind: 'absent', absence, resumeDate }),
    })
    expect(
      await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, paused.deps)
    ).toEqual({
      ok: false,
      error: 'paused_for_absence',
    })
    const delayed = setup({ findCoachAvailability: async () => ({ kind: 'delayed' }) })
    expect(
      await startCheckout({ ...base, coachSlug: 'yamada', planKind: 'trial' }, delayed.deps)
    ).toEqual({
      ok: false,
      error: 'ack_required',
    })
    expect(
      (
        await startCheckout(
          { ...base, acknowledgedDelay: true, coachSlug: 'yamada', planKind: 'trial' },
          delayed.deps
        )
      ).ok
    ).toBe(true)
  })
})
