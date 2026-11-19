import { describe, expect, it, vi } from 'vitest'
import type { Purchase } from '../../domain/values/Purchase'
import { applyInvoiceFee } from './applyInvoiceFee.usecase'

type Deps = Parameters<typeof applyInvoiceFee>[1]

const monthly: Purchase = {
  id: 'p1',
  studentUserId: 's1',
  coachUserId: 'c1',
  planKind: 'monthly',
  priceYen: 3980,
  systemFeeYen: 200,
  status: 'paid',
  stripeSubscriptionId: 'sub_1',
  stripePaymentIntentId: 'pi_1',
  monitorCodeId: null,
}

const setup = (rate: number) => {
  const setInvoiceApplicationFee = vi.fn<Deps['setInvoiceApplicationFee']>(async () => undefined)
  const resolveFeeAt = vi.fn<Deps['resolveFeeAt']>(async () => ({ rate, grantId: null }))
  const deps: Deps = {
    findPurchase: async (id) => (id === 'p1' ? monthly : null),
    resolveFeeAt,
    setInvoiceApplicationFee,
  }
  return { deps, setInvoiceApplicationFee, resolveFeeAt }
}

const createdAt = new Date('2026-12-20T00:00:00Z')

describe('applyInvoiceFee', () => {
  it('請求書ができた日の率で、手数料を入れ直す', async () => {
    const { deps, setInvoiceApplicationFee, resolveFeeAt } = setup(0.1)
    await applyInvoiceFee(
      { purchaseId: 'p1', invoiceId: 'in_1', invoiceCreatedAt: createdAt },
      deps
    )
    expect(resolveFeeAt).toHaveBeenCalledWith('c1', createdAt)
    expect(setInvoiceApplicationFee).toHaveBeenCalledWith('in_1', 598)
  })

  it('特典の期間中なら、システム利用料の分だけ', async () => {
    const { deps, setInvoiceApplicationFee } = setup(0)
    await applyInvoiceFee(
      { purchaseId: 'p1', invoiceId: 'in_1', invoiceCreatedAt: createdAt },
      deps
    )
    expect(setInvoiceApplicationFee).toHaveBeenCalledWith('in_1', 200)
  })

  it('申し込みがなければ何もしない', async () => {
    const { deps, setInvoiceApplicationFee } = setup(0.1)
    expect(
      await applyInvoiceFee(
        { purchaseId: 'x', invoiceId: 'in_1', invoiceCreatedAt: createdAt },
        deps
      )
    ).toEqual({ ok: false, error: 'purchase_not_found' })
    expect(setInvoiceApplicationFee).not.toHaveBeenCalled()
  })
})
