import { describe, expect, it, vi } from 'vitest'
import type { Purchase } from '../../domain/values/Purchase'
import { capturePurchase } from './capturePurchase.usecase'
import { voidPurchase } from './voidPurchase.usecase'

const authorized: Purchase = {
  id: 'purchase-1',
  studentUserId: 'student-1',
  coachUserId: 'coach-1',
  planKind: 'single',
  priceYen: 4980,
  systemFeeYen: 200,
  status: 'authorized',
  stripeSubscriptionId: null,
  stripePaymentIntentId: 'pi_1',
}

const now = new Date('2026-11-20T00:00:00Z')

const captureDeps = (p: Purchase | null, captured = true, allowWithoutStripe = false) => {
  const capturePaymentIntent = vi.fn(async () => captured)
  const startSubscription = vi.fn(async () => ({ subscriptionId: 'sub_1' }))
  const markPurchaseCaptured = vi.fn(async () => undefined)
  return {
    deps: {
      findPurchase: async () => p,
      capturePaymentIntent,
      startSubscription,
      markPurchaseCaptured,
      allowWithoutStripe,
    },
    capturePaymentIntent,
    startSubscription,
    markPurchaseCaptured,
  }
}

const voidDeps = (p: Purchase | null, canceled = true, allowWithoutStripe = false) => {
  const cancelPaymentIntent = vi.fn(async () => canceled)
  const markPurchaseVoided = vi.fn(async () => undefined)
  return {
    deps: {
      findPurchase: async () => p,
      cancelPaymentIntent,
      markPurchaseVoided,
      allowWithoutStripe,
    },
    cancelPaymentIntent,
    markPurchaseVoided,
  }
}

describe('capturePurchase', () => {
  it('仮押さえした支払いを確定して、支払い済みにする（冪等キーつき）', async () => {
    const { deps, capturePaymentIntent, startSubscription, markPurchaseCaptured } =
      captureDeps(authorized)
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(true)
    expect(capturePaymentIntent).toHaveBeenCalledWith('pi_1', 'capture-purchase-1')
    expect(startSubscription).not.toHaveBeenCalled()
    expect(markPurchaseCaptured).toHaveBeenCalledWith('purchase-1', { stripeSubscriptionId: null })
  })

  it('月額は、初月を確定したあと同じカードでサブスクリプションを始める（2回目は30日後）', async () => {
    const { deps, capturePaymentIntent, startSubscription, markPurchaseCaptured } = captureDeps({
      ...authorized,
      planKind: 'monthly',
      priceYen: 3980,
    })
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(true)
    expect(capturePaymentIntent).toHaveBeenCalled()
    expect(startSubscription).toHaveBeenCalledWith({
      purchaseId: 'purchase-1',
      paymentIntentId: 'pi_1',
      priceYen: 3980,
      systemFeeYen: 200,
      firstRenewalAt: new Date('2026-12-20T00:00:00Z'),
    })
    expect(markPurchaseCaptured).toHaveBeenCalledWith('purchase-1', {
      stripeSubscriptionId: 'sub_1',
    })
  })

  it('月額で初月を確定できなければ、サブスクリプションを始めない', async () => {
    const { deps, startSubscription } = captureDeps({ ...authorized, planKind: 'monthly' }, false)
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(false)
    expect(startSubscription).not.toHaveBeenCalled()
  })

  it('確定済みなら何もしない。仮押さえでない申し込みは確定しない', async () => {
    const paid = captureDeps({ ...authorized, status: 'paid' })
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, paid.deps)).ok).toBe(true)
    expect(paid.capturePaymentIntent).not.toHaveBeenCalled()
    expect(
      await capturePurchase(
        { purchaseId: 'purchase-1', now },
        captureDeps({ ...authorized, status: 'voided' }).deps
      )
    ).toEqual({ ok: false, error: 'not_authorized' })
  })

  it('確定できなければ失敗し、支払い済みにしない', async () => {
    const { deps, markPurchaseCaptured } = captureDeps(authorized, false)
    expect(await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).toEqual({
      ok: false,
      error: 'capture_failed',
    })
    expect(markPurchaseCaptured).not.toHaveBeenCalled()
  })

  it('Stripe を通っていない申し込みは、開発中だけ確定できる', async () => {
    const devPurchase = { ...authorized, stripePaymentIntentId: null }
    expect(
      (await capturePurchase({ purchaseId: 'p', now }, captureDeps(devPurchase).deps)).ok
    ).toBe(false)
    expect(
      (await capturePurchase({ purchaseId: 'p', now }, captureDeps(devPurchase, true, true).deps))
        .ok
    ).toBe(true)
  })
})

describe('voidPurchase', () => {
  it('仮押さえを外して、取り消しにする', async () => {
    const { deps, cancelPaymentIntent, markPurchaseVoided } = voidDeps(authorized)
    expect((await voidPurchase({ purchaseId: 'purchase-1' }, deps)).ok).toBe(true)
    expect(cancelPaymentIntent).toHaveBeenCalledWith('pi_1')
    expect(markPurchaseVoided).toHaveBeenCalledWith('purchase-1')
  })

  it('取り消し済みなら何もしない。確定済みは取り消さない', async () => {
    const voided = voidDeps({ ...authorized, status: 'voided' })
    expect((await voidPurchase({ purchaseId: 'purchase-1' }, voided.deps)).ok).toBe(true)
    expect(voided.cancelPaymentIntent).not.toHaveBeenCalled()
    expect(
      await voidPurchase(
        { purchaseId: 'purchase-1' },
        voidDeps({ ...authorized, status: 'paid' }).deps
      )
    ).toEqual({ ok: false, error: 'not_authorized' })
  })

  it('外せなければ失敗し、取り消しにしない', async () => {
    const { deps, markPurchaseVoided } = voidDeps(authorized, false)
    expect(await voidPurchase({ purchaseId: 'purchase-1' }, deps)).toEqual({
      ok: false,
      error: 'void_failed',
    })
    expect(markPurchaseVoided).not.toHaveBeenCalled()
  })
})
