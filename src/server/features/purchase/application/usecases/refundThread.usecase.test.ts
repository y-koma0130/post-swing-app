import { describe, expect, it, vi } from 'vitest'
import { refundThread } from './refundThread.usecase'

type Deps = Parameters<typeof refundThread>[1]
const now = new Date('2026-11-16T00:00:00Z')

const purchase = {
  id: 'p1',
  studentUserId: 's1',
  coachUserId: 'c1',
  planKind: 'single' as const,
  priceYen: 5000,
  systemFeeYen: 200,
  status: 'paid' as const,
  stripeSubscriptionId: null,
  stripePaymentIntentId: null,
  stripeCheckoutSessionId: 'cs_1',
}

const setup = (
  overrides: Partial<Pick<Deps, 'findThreadPayment' | 'findPurchaseForRefund'>> = {}
) => {
  const refundStripePayment = vi.fn<Deps['refundStripePayment']>(async () => ({ refundId: 're_1' }))
  const markThreadRefunded = vi.fn<Deps['markThreadRefunded']>(async () => undefined)
  const markPaymentRefunded = vi.fn<Deps['markPaymentRefunded']>(async () => undefined)
  const deps: Deps = {
    findThreadPayment: async () => ({ purchaseId: 'p1', stripeInvoiceId: null, refunded: false }),
    findPurchaseForRefund: async () => purchase,
    refundStripePayment,
    markThreadRefunded,
    markPaymentRefunded,
    ...overrides,
  }
  return { deps, refundStripePayment, markThreadRefunded, markPaymentRefunded }
}

describe('refundThread', () => {
  it('Stripe で返金してから、レッスンを返金済みにして終了する', async () => {
    const { deps, refundStripePayment, markThreadRefunded, markPaymentRefunded } = setup()
    expect(await refundThread({ threadId: 't1', now }, deps)).toEqual({
      ok: true,
      value: { refundId: 're_1' },
    })
    expect(refundStripePayment).toHaveBeenCalledWith(
      { kind: 'checkout_session', checkoutSessionId: 'cs_1' },
      'refund-thread-t1'
    )
    expect(markThreadRefunded).toHaveBeenCalledWith('t1', now)
    expect(markPaymentRefunded).toHaveBeenCalledWith('capture-p1', now)
  })

  it('月額の2か月目からは、その請求書の支払いに返金を残す', async () => {
    const { deps, markPaymentRefunded } = setup({
      findThreadPayment: async () => ({
        purchaseId: 'p1',
        stripeInvoiceId: 'in_1',
        refunded: false,
      }),
    })
    expect((await refundThread({ threadId: 't1', now }, deps)).ok).toBe(true)
    expect(markPaymentRefunded).toHaveBeenCalledWith('invoice-in_1', now)
  })

  it('返金済みなら Stripe を呼ばない', async () => {
    const { deps, refundStripePayment } = setup({
      findThreadPayment: async () => ({ purchaseId: 'p1', stripeInvoiceId: null, refunded: true }),
    })
    expect(await refundThread({ threadId: 't1', now }, deps)).toEqual({
      ok: false,
      error: 'already_refunded',
    })
    expect(refundStripePayment).not.toHaveBeenCalled()
  })

  it('Stripe の返金に失敗したら、返金済みにしない', async () => {
    const { deps, markThreadRefunded } = setup()
    const failing: Deps = {
      ...deps,
      refundStripePayment: async () => {
        throw new Error('stripe down')
      },
    }
    await expect(refundThread({ threadId: 't1', now }, failing)).rejects.toThrow('stripe down')
    expect(markThreadRefunded).not.toHaveBeenCalled()
  })

  it('ないレッスンは not_found', async () => {
    const { deps } = setup({ findThreadPayment: async () => null })
    expect(await refundThread({ threadId: 'x', now }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
