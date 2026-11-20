import { describe, expect, it, vi } from 'vitest'
import { paymentSchema } from '../../domain/values/Payment'
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
  monitorCodeId: null,
}

const freeMonitor: Purchase = {
  ...authorized,
  priceYen: 0,
  systemFeeYen: 0,
  stripePaymentIntentId: null,
  monitorCodeId: 'code-1',
}

const now = new Date('2026-11-20T00:00:00Z')

type CaptureDeps = Parameters<typeof capturePurchase>[1]

const captureDeps = (
  p: Purchase | null,
  captured = true,
  allowWithoutStripe = false,
  fee: { rate: number; grantId: string | null } = { rate: 0.1, grantId: null }
) => {
  const capturePaymentIntent = vi.fn<CaptureDeps['capturePaymentIntent']>(async () => captured)
  const startSubscription = vi.fn<CaptureDeps['startSubscription']>(async () => ({
    subscriptionId: 'sub_1',
  }))
  const markPurchaseCaptured = vi.fn<CaptureDeps['markPurchaseCaptured']>(async () => undefined)
  const startGrantsOnApproval = vi.fn<CaptureDeps['startGrantsOnApproval']>(async () => undefined)
  const savePayment = vi.fn<CaptureDeps['savePayment']>(async () => undefined)
  const deps: CaptureDeps = {
    findPurchase: async () => p,
    resolveFeeOnApproval: async () => fee,
    capturePaymentIntent,
    startGrantsOnApproval,
    startSubscription,
    savePayment,
    markPurchaseCaptured,
    allowWithoutStripe: async () => allowWithoutStripe,
  }
  return {
    deps,
    capturePaymentIntent,
    startSubscription,
    markPurchaseCaptured,
    startGrantsOnApproval,
    savePayment,
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
      allowWithoutStripe: async () => allowWithoutStripe,
    },
    cancelPaymentIntent,
    markPurchaseVoided,
  }
}

describe('capturePurchase', () => {
  it('仮押さえした支払いを、承認した時点の手数料で確定して記録する（冪等キーつき）', async () => {
    const { deps, capturePaymentIntent, startSubscription, markPurchaseCaptured, savePayment } =
      captureDeps(authorized)
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(true)
    // 価格の10%（498円）＋システム利用料200円
    expect(capturePaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: 'pi_1',
      applicationFeeYen: 698,
      idempotencyKey: 'capture-purchase-1-698',
    })
    expect(startSubscription).not.toHaveBeenCalled()
    expect(savePayment).toHaveBeenCalledWith({
      id: 'capture-purchase-1',
      purchaseId: 'purchase-1',
      coachUserId: 'coach-1',
      kind: 'capture',
      priceYen: 4980,
      systemFeeYen: 200,
      platformFeeRate: 0.1,
      platformFeeYen: 498,
      feeGrantId: null,
      feeAdjustedYen: 0,
      stripePaymentIntentId: 'pi_1',
      stripeInvoiceId: null,
      paidAt: now,
    })
    expect(markPurchaseCaptured).toHaveBeenCalledWith('purchase-1', { stripeSubscriptionId: null })
  })

  it('特典で0%なら、取り分はシステム利用料だけ。確定したら特典を始め、使った特典を残す', async () => {
    const { deps, capturePaymentIntent, startGrantsOnApproval, savePayment } = captureDeps(
      authorized,
      true,
      false,
      { rate: 0, grantId: 'grant-1' }
    )
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(true)
    expect(capturePaymentIntent.mock.calls[0]?.[0].applicationFeeYen).toBe(200)
    expect(startGrantsOnApproval).toHaveBeenCalledWith('coach-1', now)
    expect(savePayment.mock.calls[0]?.[0]).toMatchObject({
      platformFeeRate: 0,
      platformFeeYen: 0,
      feeGrantId: 'grant-1',
    })
  })

  it('月額は、初月を確定したあと同じカードでサブスクリプションを始める（2回目は30日後）', async () => {
    const { deps, capturePaymentIntent, startSubscription, markPurchaseCaptured } = captureDeps({
      ...authorized,
      planKind: 'monthly',
      priceYen: 3980,
    })
    expect((await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).ok).toBe(true)
    // 価格の10%（398円）＋システム利用料200円
    expect(capturePaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: 'pi_1',
      applicationFeeYen: 598,
      idempotencyKey: 'capture-purchase-1-598',
    })
    expect(startSubscription).toHaveBeenCalledWith({
      purchaseId: 'purchase-1',
      paymentIntentId: 'pi_1',
      priceYen: 3980,
      systemFeeYen: 200,
      platformFeeRate: 0.1,
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

  it('確定できなければ失敗し、支払い済みにしない。特典も始めない', async () => {
    const { deps, markPurchaseCaptured, startGrantsOnApproval, savePayment } = captureDeps(
      authorized,
      false
    )
    expect(await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).toEqual({
      ok: false,
      error: 'capture_failed',
    })
    expect(markPurchaseCaptured).not.toHaveBeenCalled()
    expect(startGrantsOnApproval).not.toHaveBeenCalled()
    expect(savePayment).not.toHaveBeenCalled()
  })

  it('申し込みがなければ not_found。請求も記録もしない', async () => {
    const { deps, capturePaymentIntent, savePayment, markPurchaseCaptured } = captureDeps(null)
    expect(await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(capturePaymentIntent).not.toHaveBeenCalled()
    expect(savePayment).not.toHaveBeenCalled()
    expect(markPurchaseCaptured).not.toHaveBeenCalled()
  })

  it('Stripe を通っていない申し込みは、本番では確定せず、記録もしない', async () => {
    const devPurchase = { ...authorized, stripePaymentIntentId: null }
    const { deps, savePayment, markPurchaseCaptured, startGrantsOnApproval } =
      captureDeps(devPurchase)
    expect(await capturePurchase({ purchaseId: 'p', now }, deps)).toEqual({
      ok: false,
      error: 'capture_failed',
    })
    expect(savePayment).not.toHaveBeenCalled()
    expect(markPurchaseCaptured).not.toHaveBeenCalled()
    expect(startGrantsOnApproval).not.toHaveBeenCalled()
  })

  it('Stripe を通っていない申し込みは、開発中だけ確定できる（Stripe は呼ばない）', async () => {
    const devPurchase = { ...authorized, stripePaymentIntentId: null }
    const { deps, capturePaymentIntent, markPurchaseCaptured } = captureDeps(
      devPurchase,
      true,
      true
    )
    expect((await capturePurchase({ purchaseId: 'p', now }, deps)).ok).toBe(true)
    expect(capturePaymentIntent).not.toHaveBeenCalled()
    expect(markPurchaseCaptured).toHaveBeenCalledWith('purchase-1', { stripeSubscriptionId: null })
  })

  it('Stripe を通さずに進めてよいかは、その申し込み（のコーチ）で決める（デモのコーチなど）', async () => {
    const demoPurchase = { ...authorized, stripePaymentIntentId: null }
    const { deps } = captureDeps(demoPurchase)
    const allowWithoutStripe = vi.fn<CaptureDeps['allowWithoutStripe']>(
      async (p) => p.coachUserId === authorized.coachUserId
    )
    const result = await capturePurchase({ purchaseId: 'p', now }, { ...deps, allowWithoutStripe })
    expect(result.ok).toBe(true)
    expect(allowWithoutStripe).toHaveBeenCalledWith(demoPurchase)
  })

  it('無料のモニターは、本番でも Stripe を通さずに確定し、0円で記録する', async () => {
    const { deps, capturePaymentIntent, savePayment, markPurchaseCaptured } =
      captureDeps(freeMonitor)
    expect(await capturePurchase({ purchaseId: 'purchase-1', now }, deps)).toEqual({
      ok: true,
      value: { purchaseId: 'purchase-1' },
    })
    expect(capturePaymentIntent).not.toHaveBeenCalled()
    expect(savePayment.mock.calls[0]?.[0]).toMatchObject({
      priceYen: 0,
      systemFeeYen: 0,
      platformFeeYen: 0,
      stripePaymentIntentId: null,
    })
    // 0円の記録も、保存のときの検証を通る
    expect(paymentSchema.safeParse(savePayment.mock.calls[0]?.[0]).success).toBe(true)
    expect(markPurchaseCaptured).toHaveBeenCalledWith('purchase-1', { stripeSubscriptionId: null })
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

  it('無料のモニターは、本番でも Stripe を呼ばずに取り消す', async () => {
    const { deps, cancelPaymentIntent, markPurchaseVoided } = voidDeps(freeMonitor)
    expect((await voidPurchase({ purchaseId: 'purchase-1' }, deps)).ok).toBe(true)
    expect(cancelPaymentIntent).not.toHaveBeenCalled()
    expect(markPurchaseVoided).toHaveBeenCalledWith('purchase-1')
  })
})
