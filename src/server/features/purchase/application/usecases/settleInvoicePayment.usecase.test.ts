import { describe, expect, it, vi } from 'vitest'
import type { Payment } from '../../domain/values/Payment'
import type { Purchase } from '../../domain/values/Purchase'
import { settleInvoicePayment } from './settleInvoicePayment.usecase'

type Deps = Parameters<typeof settleInvoicePayment>[1]

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
}

const createdAt = new Date('2026-12-20T00:00:00Z')
const paidAt = new Date('2026-12-20T01:00:00Z')

const params = {
  purchaseId: 'p1',
  invoiceId: 'in_1',
  invoiceCreatedAt: createdAt,
  paidAt,
}

const setup = (
  overrides: {
    rate?: number
    grantId?: string | null
    chargedYen?: number | null
    recorded?: Payment | null
    purchase?: Purchase | null
  } = {}
) => {
  const refundApplicationFee = vi.fn<Deps['refundApplicationFee']>(async () => undefined)
  const savePayment = vi.fn<Deps['savePayment']>(async () => undefined)
  const chargedYen = overrides.chargedYen === undefined ? 598 : overrides.chargedYen
  const deps: Deps = {
    findPurchase: async () => (overrides.purchase === undefined ? monthly : overrides.purchase),
    findPayment: async () => overrides.recorded ?? null,
    resolveFeeAt: async () => ({ rate: overrides.rate ?? 0.1, grantId: overrides.grantId ?? null }),
    findInvoiceApplicationFee: async () =>
      chargedYen === null
        ? null
        : { applicationFeeId: 'fee_1', amountYen: chargedYen, paymentIntentId: 'pi_2' },
    refundApplicationFee,
    savePayment,
  }
  return { deps, refundApplicationFee, savePayment }
}

describe('settleInvoicePayment', () => {
  it('正しい手数料で取れていれば、記録するだけ', async () => {
    const { deps, refundApplicationFee, savePayment } = setup()
    expect(await settleInvoicePayment(params, deps)).toEqual({
      ok: true,
      value: { feeAdjustedYen: 0 },
    })
    expect(refundApplicationFee).not.toHaveBeenCalled()
    expect(savePayment).toHaveBeenCalledWith({
      id: 'invoice-in_1',
      purchaseId: 'p1',
      coachUserId: 'c1',
      kind: 'invoice',
      priceYen: 3980,
      systemFeeYen: 200,
      platformFeeRate: 0.1,
      platformFeeYen: 398,
      feeGrantId: null,
      feeAdjustedYen: 0,
      stripePaymentIntentId: 'pi_2',
      stripeInvoiceId: 'in_1',
      paidAt,
    })
  })

  it('特典の期間中に10%で取られていたら、差額をコーチへ戻して記録する', async () => {
    const { deps, refundApplicationFee, savePayment } = setup({ rate: 0, grantId: 'g1' })
    expect(await settleInvoicePayment(params, deps)).toEqual({
      ok: true,
      value: { feeAdjustedYen: 398 },
    })
    expect(refundApplicationFee).toHaveBeenCalledWith({
      applicationFeeId: 'fee_1',
      amountYen: 398,
      idempotencyKey: 'fee-adjust-in_1',
    })
    expect(savePayment.mock.calls[0]?.[0]).toMatchObject({
      platformFeeRate: 0,
      platformFeeYen: 0,
      feeGrantId: 'g1',
      feeAdjustedYen: 398,
    })
  })

  it('少なく取っていても、追加では取らない', async () => {
    const { deps, refundApplicationFee } = setup({ chargedYen: 200 })
    expect(await settleInvoicePayment(params, deps)).toEqual({
      ok: true,
      value: { feeAdjustedYen: 0 },
    })
    expect(refundApplicationFee).not.toHaveBeenCalled()
  })

  it('同じ請求書は1回だけ（記録済みなら戻さない）', async () => {
    const recorded: Payment = {
      id: 'invoice-in_1',
      purchaseId: 'p1',
      coachUserId: 'c1',
      kind: 'invoice',
      priceYen: 3980,
      systemFeeYen: 200,
      platformFeeRate: 0,
      platformFeeYen: 0,
      feeGrantId: 'g1',
      feeAdjustedYen: 398,
      stripePaymentIntentId: 'pi_2',
      stripeInvoiceId: 'in_1',
      paidAt,
    }
    const { deps, refundApplicationFee, savePayment } = setup({ rate: 0, recorded })
    expect(await settleInvoicePayment(params, deps)).toEqual({
      ok: true,
      value: { feeAdjustedYen: 398 },
    })
    expect(refundApplicationFee).not.toHaveBeenCalled()
    expect(savePayment).not.toHaveBeenCalled()
  })

  it('申し込みがなければ失敗し、返金も記録もしない（Stripe に再送してもらう）', async () => {
    const { deps, refundApplicationFee, savePayment } = setup({ rate: 0, purchase: null })
    expect(await settleInvoicePayment(params, deps)).toEqual({
      ok: false,
      error: 'purchase_not_found',
    })
    expect(refundApplicationFee).not.toHaveBeenCalled()
    expect(savePayment).not.toHaveBeenCalled()
  })
})
