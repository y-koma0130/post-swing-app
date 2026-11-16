import { describe, expect, it } from 'vitest'
import { checkPurchaseEligibility, type EligibilityCoach } from './checkPurchaseEligibility.service'

const coach: EligibilityCoach = {
  userId: 'coach-1',
  stripeAccountId: 'acct_1',
  chargesEnabled: true,
  monthlyCapacity: 5,
  plans: [
    { kind: 'trial', name: 'お試し', priceYen: 1000, active: true },
    { kind: 'single', name: '1スレッド', priceYen: 5000, active: true },
    { kind: 'monthly', name: '月額', priceYen: 8000, active: false },
  ],
}
const facts = { activeThreadCount: 0, hasPaidTrial: false, hasActiveSubscription: false }
const check = (overrides: Partial<Parameters<typeof checkPurchaseEligibility>[0]> = {}) =>
  checkPurchaseEligibility({
    coach,
    planKind: 'single',
    studentUserId: 'student-1',
    facts,
    ...overrides,
  })

describe('checkPurchaseEligibility', () => {
  it('申し込めるなら、プラン・送金先・支払い方を返す', () => {
    expect(check()).toEqual({
      ok: true,
      value: {
        plan: { name: '1スレッド', priceYen: 5000 },
        destinationAccountId: 'acct_1',
        mode: 'payment',
      },
    })
  })

  it('月額はサブスクリプション', () => {
    const monthly = { ...coach, plans: coach.plans.map((p) => ({ ...p, active: true })) }
    const result = check({ coach: monthly, planKind: 'monthly' })
    expect(result.ok && result.value.mode).toBe('subscription')
  })

  it('受付を止めたプラン・決済を受けられないコーチには申し込めない', () => {
    expect(check({ planKind: 'monthly' })).toEqual({ ok: false, error: 'not_accepting' })
    expect(check({ coach: { ...coach, chargesEnabled: false } })).toEqual({
      ok: false,
      error: 'not_accepting',
    })
    expect(check({ coach: { ...coach, stripeAccountId: null } })).toEqual({
      ok: false,
      error: 'not_accepting',
    })
  })

  it('自分自身には申し込めない', () => {
    expect(check({ studentUserId: 'coach-1' })).toEqual({ ok: false, error: 'own_coach' })
  })

  it('受付枠が埋まっていたら申し込めない', () => {
    expect(check({ facts: { ...facts, activeThreadCount: 5 } })).toEqual({
      ok: false,
      error: 'full',
    })
  })

  it('お試しは同じコーチに1回まで', () => {
    expect(check({ planKind: 'trial', facts: { ...facts, hasPaidTrial: true } })).toEqual({
      ok: false,
      error: 'trial_used',
    })
    expect(check({ planKind: 'single', facts: { ...facts, hasPaidTrial: true } }).ok).toBe(true)
  })

  it('月額は2重に申し込めない', () => {
    const monthly = { ...coach, plans: coach.plans.map((p) => ({ ...p, active: true })) }
    expect(
      check({
        coach: monthly,
        planKind: 'monthly',
        facts: { ...facts, hasActiveSubscription: true },
      })
    ).toEqual({ ok: false, error: 'already_subscribed' })
  })
})
