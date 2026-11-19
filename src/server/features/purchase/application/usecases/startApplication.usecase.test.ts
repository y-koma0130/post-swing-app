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
  monitorCode: null,
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
    { kind: 'single', name: '1レッスン', priceYen: 4980, active: true },
  ],
}

const setup = (overrides: Partial<Deps> = {}) => {
  const savePendingPurchase = vi.fn<Deps['savePendingPurchase']>(async () => true)
  const createThread = vi.fn<Deps['createThread']>(async () => undefined)
  let n = 0
  const deps: Deps = {
    findCoachForCheckout: async () => coach,
    countActiveThreads: async () => 0,
    hasPaidTrial: async () => false,
    hasActiveSubscription: async () => false,
    findCoachAvailability: async () => ({ kind: 'available', replyTargetHours: 48 }),
    findOpenApplication: async () => null,
    resolveMonitorCode: async ({ code }) =>
      code === 'ABCD2345'
        ? { ok: true, value: { codeId: 'code-1', priceYen: 0, maxUses: 3 } }
        : { ok: false, error: 'code_not_found' },
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
    expect(savePendingPurchase).toHaveBeenCalledWith(
      {
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
        monitorCodeId: null,
      },
      null
    )
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

  it('コーチが見つからなければ not_found。申し込みも下書きも作らない', async () => {
    const { deps, savePendingPurchase, createThread } = setup({
      findCoachForCheckout: async () => null,
    })
    expect(await startApplication({ ...params, coachSlug: 'unknown' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('コーチ本人は自分に申し込めない', async () => {
    const { deps, savePendingPurchase, createThread } = setup()
    expect(
      await startApplication({ ...params, actor: { userId: 'coach-1', name: '山田' } }, deps)
    ).toEqual({ ok: false, error: 'own_coach' })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('満枠なら申し込めず、何も作らない', async () => {
    const { deps, savePendingPurchase, createThread } = setup({
      countActiveThreads: async () => 2,
    })
    expect(await startApplication(params, deps)).toEqual({ ok: false, error: 'full' })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('お試し済みならお試しに申し込めず、何も作らない', async () => {
    const { deps, savePendingPurchase, createThread } = setup({ hasPaidTrial: async () => true })
    expect(await startApplication({ ...params, planKind: 'trial' }, deps)).toEqual({
      ok: false,
      error: 'trial_used',
    })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('コーチの不在中（新規を止めている）は申し込めず、何も作らない', async () => {
    const absence = {
      id: 'a1',
      coachUserId: 'coach-1',
      startDate: localDateSchema.parse('2026-11-15'),
      endDate: localDateSchema.parse('2026-11-18'),
      note: '',
      pauseNewSignups: false,
    }
    const { deps, savePendingPurchase, createThread } = setup({
      findCoachAvailability: async () => ({
        kind: 'absent',
        absence,
        resumeDate: localDateSchema.parse('2026-11-19'),
      }),
    })
    expect(await startApplication({ ...params, acknowledgedDelay: true }, deps)).toEqual({
      ok: false,
      error: 'paused_for_absence',
    })
    expect(savePendingPurchase).not.toHaveBeenCalled()
    expect(createThread).not.toHaveBeenCalled()
  })

  it('プロモコードがあれば、1レッスンをモニター価格（無料ならシステム利用料も0円）で申し込む', async () => {
    const { deps, savePendingPurchase } = setup()
    expect((await startApplication({ ...params, monitorCode: 'ABCD2345' }, deps)).ok).toBe(true)
    expect(savePendingPurchase).toHaveBeenCalledWith(
      expect.objectContaining({ priceYen: 0, systemFeeYen: 0, monitorCodeId: 'code-1' }),
      { codeId: 'code-1', maxUses: 3 }
    )
  })

  it('モニターは、1レッスンを受付中にしていなくても申し込める', async () => {
    const { deps } = setup({
      findCoachForCheckout: async () => ({
        ...coach,
        plans: coach.plans.map((p) => ({ ...p, active: false })),
      }),
    })
    expect((await startApplication({ ...params, monitorCode: 'ABCD2345' }, deps)).ok).toBe(true)
    expect((await startApplication(params, deps)).ok).toBe(false)
  })

  it('プロモコードは1レッスンだけ。使えないコードなら、申し込みを作らない', async () => {
    const trial = setup()
    expect(
      await startApplication({ ...params, planKind: 'trial', monitorCode: 'ABCD2345' }, trial.deps)
    ).toEqual({ ok: false, error: 'monitor_single_only' })
    const unknown = setup()
    expect(await startApplication({ ...params, monitorCode: 'ZZZZ9999' }, unknown.deps)).toEqual({
      ok: false,
      error: 'code_not_found',
    })
    expect(trial.savePendingPurchase).not.toHaveBeenCalled()
    expect(unknown.savePendingPurchase).not.toHaveBeenCalled()
    expect(unknown.createThread).not.toHaveBeenCalled()
  })

  it('同時に申し込まれて先着の人数を超えたら、下書きを作らない', async () => {
    const { deps, createThread } = setup({ savePendingPurchase: async () => false })
    expect(await startApplication({ ...params, monitorCode: 'ABCD2345' }, deps)).toEqual({
      ok: false,
      error: 'code_full',
    })
    expect(createThread).not.toHaveBeenCalled()
  })
})
