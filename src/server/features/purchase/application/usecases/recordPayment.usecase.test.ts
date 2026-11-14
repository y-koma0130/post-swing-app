import { describe, expect, it, vi } from 'vitest'
import type { Purchase } from '../../domain/values/Purchase'
import { recordPayment } from './recordPayment.usecase'

type Deps = Parameters<typeof recordPayment>[1]

const purchase: Purchase = {
  id: 'purchase-1',
  studentUserId: 'student-1',
  coachUserId: 'coach-1',
  planKind: 'single',
  priceYen: 4980,
  status: 'pending',
  stripeSubscriptionId: null,
}

const paidAt = new Date('2026-11-14T00:00:00Z')

const setup = (overrides: Partial<Omit<Deps, 'createThread' | 'markPurchasePaid'>> = {}) => {
  const createThread = vi.fn<Deps['createThread']>(async () => undefined)
  const markPurchasePaid = vi.fn<Deps['markPurchasePaid']>(async () => undefined)
  const deps: Deps = {
    findPurchase: async () => purchase,
    threadExists: async () => false,
    generateId: () => 'thread-1',
    ...overrides,
    createThread,
    markPurchasePaid,
  }
  return { deps, createThread, markPurchasePaid }
}

describe('recordPayment', () => {
  it('都度払い：支払い済みにして、30日のスレッドを作る', async () => {
    const { deps, createThread, markPurchasePaid } = setup()
    const result = await recordPayment(
      { purchaseId: 'purchase-1', stripeCustomerId: 'cus_1', subscription: null, paidAt },
      deps
    )
    expect(result).toEqual({ ok: true, value: { threadCreated: true } })
    expect(markPurchasePaid).toHaveBeenCalledWith('purchase-1', {
      stripeCustomerId: 'cus_1',
      stripeSubscriptionId: null,
    })
    expect(createThread.mock.calls[0]?.[0]).toMatchObject({
      purchaseId: 'purchase-1',
      studentUserId: 'student-1',
      expiresAt: new Date('2026-12-14T00:00:00Z'),
      stripeInvoiceId: null,
    })
  })

  it('同じ通知が2回届いても、スレッドは1つだけ', async () => {
    const { deps, createThread } = setup({
      findPurchase: async () => ({ ...purchase, status: 'paid' }),
      threadExists: async () => true,
    })
    const result = await recordPayment(
      { purchaseId: 'purchase-1', stripeCustomerId: 'cus_1', subscription: null, paidAt },
      deps
    )
    expect(result).toEqual({ ok: true, value: { threadCreated: false } })
    expect(createThread).not.toHaveBeenCalled()
  })

  it('月額：請求ごとにスレッドを作り、請求IDで重複を見分ける', async () => {
    const threadExists = vi.fn<Deps['threadExists']>(async () => false)
    const { deps, createThread } = setup({
      findPurchase: async () => ({ ...purchase, planKind: 'monthly', status: 'paid' }),
      threadExists,
    })
    await recordPayment(
      {
        purchaseId: 'purchase-1',
        stripeCustomerId: 'cus_1',
        subscription: { subscriptionId: 'sub_1', invoiceId: 'in_2' },
        paidAt,
      },
      deps
    )
    expect(threadExists).toHaveBeenCalledWith({ invoiceId: 'in_2' })
    expect(createThread.mock.calls[0]?.[0].stripeInvoiceId).toBe('in_2')
  })

  it('知らない申し込みならエラー', async () => {
    const { deps } = setup({ findPurchase: async () => null })
    expect(
      await recordPayment(
        { purchaseId: 'x', stripeCustomerId: null, subscription: null, paidAt },
        deps
      )
    ).toEqual({ ok: false, error: 'purchase_not_found' })
  })
})
