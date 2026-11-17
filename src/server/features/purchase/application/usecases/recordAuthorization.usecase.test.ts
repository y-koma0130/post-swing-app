import { describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/server/utils/result'
import type { Purchase } from '../../domain/values/Purchase'
import { recordAuthorization } from './recordAuthorization.usecase'

type Deps = Parameters<typeof recordAuthorization>[1]

const now = new Date('2026-11-16T00:00:00Z')
const purchase: Purchase = {
  id: 'purchase-1',
  studentUserId: 'student-1',
  coachUserId: 'coach-1',
  planKind: 'single',
  priceYen: 4980,
  status: 'pending',
  stripeSubscriptionId: null,
  stripePaymentIntentId: null,
}
const params = { purchaseId: 'purchase-1', paymentIntentId: 'pi_1', stripeCustomerId: 'cus_1', now }

const setup = (p: Purchase | null = purchase, requested = true) => {
  const markPurchaseAuthorized = vi.fn<Deps['markPurchaseAuthorized']>(async () => undefined)
  const markPurchaseVoided = vi.fn<Deps['markPurchaseVoided']>(async () => undefined)
  const requestApproval = vi.fn<Deps['requestApproval']>(async () =>
    requested ? ok(null) : err('not_draft')
  )
  const cancelPaymentIntent = vi.fn<Deps['cancelPaymentIntent']>(async () => true)
  const deps: Deps = {
    findPurchase: async () => p,
    markPurchaseAuthorized,
    markPurchaseVoided,
    requestApproval,
    cancelPaymentIntent,
  }
  return { deps, markPurchaseAuthorized, markPurchaseVoided, requestApproval, cancelPaymentIntent }
}

describe('recordAuthorization', () => {
  it('仮押さえを記録し、申し込みをコーチの承認待ちにする', async () => {
    const { deps, markPurchaseAuthorized, requestApproval, cancelPaymentIntent } = setup()
    expect(await recordAuthorization(params, deps)).toEqual({
      ok: true,
      value: { outcome: 'requested' },
    })
    expect(markPurchaseAuthorized).toHaveBeenCalledWith('purchase-1', {
      stripePaymentIntentId: 'pi_1',
      stripeCustomerId: 'cus_1',
    })
    expect(requestApproval).toHaveBeenCalledWith({ purchaseId: 'purchase-1', now })
    expect(cancelPaymentIntent).not.toHaveBeenCalled()
  })

  it('同じ仮押さえの通知が2回届いても、そのまま承認待ち', async () => {
    const { deps, markPurchaseAuthorized, cancelPaymentIntent } = setup({
      ...purchase,
      status: 'authorized',
      stripePaymentIntentId: 'pi_1',
    })
    expect((await recordAuthorization(params, deps)).ok).toBe(true)
    expect(markPurchaseAuthorized).not.toHaveBeenCalled()
    expect(cancelPaymentIntent).not.toHaveBeenCalled()
  })

  it('別の支払い画面からも仮押さえされたら、あとのほうを外す', async () => {
    const { deps, requestApproval, cancelPaymentIntent } = setup({
      ...purchase,
      status: 'authorized',
      stripePaymentIntentId: 'pi_first',
    })
    expect(await recordAuthorization(params, deps)).toEqual({
      ok: true,
      value: { outcome: 'released' },
    })
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1')
    expect(requestApproval).not.toHaveBeenCalled()
  })

  it('下書きが消えていたら、仮押さえを外して申し込みを取り消す', async () => {
    const { deps, cancelPaymentIntent, markPurchaseVoided } = setup(purchase, false)
    expect(await recordAuthorization(params, deps)).toEqual({
      ok: true,
      value: { outcome: 'released' },
    })
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1')
    expect(markPurchaseVoided).toHaveBeenCalledWith('purchase-1')
  })

  it('申し込みがなければ失敗（Stripe に再送してもらう）', async () => {
    expect(await recordAuthorization(params, setup(null).deps)).toEqual({
      ok: false,
      error: 'purchase_not_found',
    })
  })
})
