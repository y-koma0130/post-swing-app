import { describe, expect, it, vi } from 'vitest'
import type { Purchase } from '../../domain/values/Purchase'
import type { CheckoutCoach } from './startApplication.usecase'
import { startApplicationCheckout } from './startApplicationCheckout.usecase'

type Deps = Parameters<typeof startApplicationCheckout>[1]

const now = new Date('2026-11-16T00:00:00Z')
const actor = { userId: 'student-1', name: '佐藤' }
const coach: CheckoutCoach & { slug: string } = {
  userId: 'coach-1',
  slug: 'yamada',
  name: '山田',
  stripeAccountId: 'acct_1',
  chargesEnabled: true,
  suspended: false,
  monthlyCapacity: 2,
  plans: [{ kind: 'single', name: '1レッスン', priceYen: 6000, active: true }],
}
const purchase: Purchase = {
  id: 'purchase-1',
  studentUserId: 'student-1',
  coachUserId: 'coach-1',
  planKind: 'single',
  // 下書きを作ったときの価格（そのあとコーチが 6000 円に変えた）
  priceYen: 4980,
  systemFeeYen: 200,
  status: 'pending',
  stripeSubscriptionId: null,
  stripePaymentIntentId: null,
}
const draft = {
  id: 'thread-1',
  purchaseId: 'purchase-1',
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  status: 'draft' as const,
  submissionCount: 1,
}

const setup = (overrides: Partial<Deps> = {}) => {
  const createCheckoutSession = vi.fn<Deps['createCheckoutSession']>(async () => ({
    sessionId: 'cs_1',
    url: 'https://checkout.stripe.com/c/cs_1',
  }))
  const attachCheckoutSession = vi.fn<Deps['attachCheckoutSession']>(async () => undefined)
  const deps: Deps = {
    findApplicationThread: async () => draft,
    findPurchase: async () => purchase,
    findCoachForCheckoutByUserId: async () => coach,
    countActiveThreads: async () => 0,
    hasPaidTrial: async () => false,
    hasActiveSubscription: async () => false,
    findCoachAvailability: async () => ({ kind: 'available', replyTargetHours: 48 }),
    createCheckoutSession,
    attachCheckoutSession,
    ...overrides,
  }
  return { deps, createCheckoutSession, attachCheckoutSession }
}

describe('startApplicationCheckout', () => {
  it('申し込んだときの価格で、カードを仮押さえする支払い画面を作る', async () => {
    const { deps, createCheckoutSession, attachCheckoutSession } = setup()
    expect(await startApplicationCheckout({ actor, threadId: 'thread-1', now }, deps)).toEqual({
      ok: true,
      value: { url: 'https://checkout.stripe.com/c/cs_1' },
    })
    expect(createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      purchaseId: 'purchase-1',
      threadId: 'thread-1',
      productName: '山田：1レッスン',
      priceYen: 4980,
      systemFeeYen: 200,
      applicationFeeYen: 698,
      destinationAccountId: 'acct_1',
      saveCardForRenewal: false,
    })
    expect(attachCheckoutSession).toHaveBeenCalledWith('purchase-1', 'cs_1')
  })

  it('本人の下書きだけ。悩みと動画を送ってから', async () => {
    const { deps, createCheckoutSession } = setup()
    expect(
      await startApplicationCheckout(
        { actor: { userId: 'other', name: '' }, threadId: 'thread-1', now },
        deps
      )
    ).toEqual({ ok: false, error: 'not_found' })
    expect(
      await startApplicationCheckout(
        { actor, threadId: 'thread-1', now },
        setup({ findApplicationThread: async () => ({ ...draft, submissionCount: 0 }) }).deps
      )
    ).toEqual({ ok: false, error: 'no_submission' })
    expect(
      await startApplicationCheckout(
        { actor, threadId: 'thread-1', now },
        setup({ findApplicationThread: async () => ({ ...draft, status: 'requested' }) }).deps
      )
    ).toEqual({ ok: false, error: 'not_draft' })
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('下書きのあいだに満枠になったら、カードの登録へ進めない', async () => {
    const { deps, createCheckoutSession } = setup({ countActiveThreads: async () => 2 })
    expect(await startApplicationCheckout({ actor, threadId: 'thread-1', now }, deps)).toEqual({
      ok: false,
      error: 'full',
    })
    expect(createCheckoutSession).not.toHaveBeenCalled()
  })

  it('月額は初月分を仮押さえし、2か月目からの請求に使うカードを保存しておく', async () => {
    const monthlyCoach = {
      ...coach,
      plans: [{ kind: 'monthly' as const, name: '月額', priceYen: 3980, active: true }],
    }
    const { deps, createCheckoutSession } = setup({
      findPurchase: async () => ({ ...purchase, planKind: 'monthly', priceYen: 3980 }),
      findCoachForCheckoutByUserId: async () => monthlyCoach,
    })
    expect((await startApplicationCheckout({ actor, threadId: 'thread-1', now }, deps)).ok).toBe(
      true
    )
    expect(createCheckoutSession.mock.calls[0]?.[0]).toMatchObject({
      productName: '山田：月額（初月）',
      priceYen: 3980,
      saveCardForRenewal: true,
    })
  })
})
