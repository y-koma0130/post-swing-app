import { describe, expect, it } from 'vitest'
import { checkRefund } from './checkRefund.service'

const paid = { status: 'paid' as const, stripeCheckoutSessionId: 'cs_1' }
const thread = { stripeInvoiceId: null, refunded: false }

describe('checkRefund', () => {
  it('都度払いは申し込みの Checkout を返金する', () => {
    expect(checkRefund({ purchase: paid, thread })).toEqual({
      ok: true,
      value: { kind: 'checkout_session', checkoutSessionId: 'cs_1' },
    })
  })

  it('月額は、そのレッスンを作った請求だけを返金する', () => {
    expect(checkRefund({ purchase: paid, thread: { ...thread, stripeInvoiceId: 'in_1' } })).toEqual(
      {
        ok: true,
        value: { kind: 'invoice', invoiceId: 'in_1' },
      }
    )
  })

  it('解約済みの月額でも、払った請求は返金できる', () => {
    expect(
      checkRefund({
        purchase: { ...paid, status: 'canceled' },
        thread: { ...thread, stripeInvoiceId: 'in_1' },
      }).ok
    ).toBe(true)
  })

  it('返金済み・未払い・Stripe を通っていない支払いは返金しない', () => {
    expect(checkRefund({ purchase: paid, thread: { ...thread, refunded: true } })).toEqual({
      ok: false,
      error: 'already_refunded',
    })
    expect(checkRefund({ purchase: { ...paid, status: 'pending' }, thread })).toEqual({
      ok: false,
      error: 'not_paid',
    })
    expect(checkRefund({ purchase: { ...paid, stripeCheckoutSessionId: null }, thread })).toEqual({
      ok: false,
      error: 'no_stripe_payment',
    })
  })

  it('仮押さえ・取り消しの申し込みは、請求していないので返金しない', () => {
    for (const status of ['authorized', 'voided'] as const) {
      expect(checkRefund({ purchase: { ...paid, status }, thread })).toEqual({
        ok: false,
        error: 'not_paid',
      })
    }
  })
})
