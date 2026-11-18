import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { type CheckoutCoach, startApplication } from './startApplication.usecase'

type Deps = Parameters<typeof startApplication>[1]

const now = new Date('2026-11-16T00:00:00Z')
const params = {
  actor: { userId: 'student-1', name: '佐藤' },
  coachSlug: 'yamada',
  planKind: 'single' as const,
  acknowledgedDelay: false,
  now,
}
const coach: CheckoutCoach = {
  userId: 'coach-1',
  name: '山田',
  stripeAccountId: 'acct_1',
  chargesEnabled: true,
  suspended: false,
  monthlyCapacity: 2,
  plans: [
    { kind: 'trial', name: 'お試し', priceYen: 550, active: true },
    { kind: 'single', name: '1スレッド', priceYen: 4980, active: true },
  ],
}

const setup = (overrides: Partial<Deps> = {}) => {
  const savePendingPurchase = vi.fn<Deps['savePendingPurchase']>(async () => undefined)
  const createThread = vi.fn<Deps['createThread']>(async () => undefined)
  let n = 0
  const deps: Deps = {
    findCoachForCheckout: async () => coach,
    countActiveThreads: async () => 0,
    hasPaidTrial: async () => false,
    hasActiveSubscription: async () => false,
    findCoachAvailability: async () => ({ kind: 'available', replyTargetHours: 48 }),
    findOpenApplication: async () => null,
    savePendingPurchase,
    createThread,
    generateId: () => `id-${++n}`,
    ...overrides,
  }
  return { deps, savePendingPurchase, createThread }
}

describe('startApplication', () => {
  it('支払い前の申し込みと、悩みと動画を送る下書きを作る', async () => {
    const { deps, savePendingPurchase, createThread } = setup()
    expect(await startApplication(params, deps)).toEqual({ ok: true, value: { threadId: 'id-2' } })
    expect(savePendingPurchase).toHaveBeenCalledWith({
      id: 'id-1',
      studentUserId: 'student-1',
      coachUserId: 'coach-1',
      planKind: 'single',
      priceYen: 4980,
      // 価格の5%（200円より高い）
      systemFeeYen: 249,
      status: 'pending',
      stripeSubscriptionId: null,
      stripePaymentIntentId: null,
    })
    expect(createThread.mock.calls[0]?.[0]).toMatchObject({
      id: 'id-2',
      purchaseId: 'id-1',
      status: 'draft',
      planKind: 'single',
    })
  })

  it('このコーチへの決まっていない申し込みがあれば、新しく作らずそれを返す（1人1件）', async () => {
    const { deps, savePendingPurchase, createThread } = setup({
      findOpenApplication: async () => ({ threadId: 'open-1' }),
    })
    expect(await startApplication(params, deps)).toEqual({
      ok: true,
      value: { threadId: 'open-1' },
    })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('満枠・お試し済み・コーチの不在中は申し込めない', async () => {
    expect(
      await startApplication(params, setup({ countActiveThreads: async () => 2 }).deps)
    ).toEqual({ ok: false, error: 'full' })
    expect(
      await startApplication(
        { ...params, planKind: 'trial' },
        setup({ hasPaidTrial: async () => true }).deps
      )
    ).toEqual({ ok: false, error: 'trial_used' })
    const absence = {
      id: 'a1',
      coachUserId: 'coach-1',
      startDate: localDateSchema.parse('2026-11-15'),
      endDate: localDateSchema.parse('2026-11-18'),
      note: '',
      pauseNewSignups: false,
    }
    expect(
      await startApplication(
        { ...params, acknowledgedDelay: true },
        setup({
          findCoachAvailability: async () => ({
            kind: 'absent',
            absence,
            resumeDate: localDateSchema.parse('2026-11-19'),
          }),
        }).deps
      )
    ).toEqual({ ok: false, error: 'paused_for_absence' })
  })
})
