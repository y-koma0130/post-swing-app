import { calcThreadPeriod } from '@/server/features/thread/domain/services/calcThreadPeriod.service'
import { err, ok, type Result } from '@/server/utils/result'
import type { Purchase } from '../../domain/values/Purchase'

export type StartSubscriptionInput = Readonly<{
  purchaseId: string
  /** 初月の支払い（ここから顧客・保存したカード・送金先を引き継ぐ） */
  paymentIntentId: string
  priceYen: number
  systemFeeYen: number
  /** 2回目の請求日 */
  firstRenewalAt: Date
}>

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  /** 仮押さえした支払いを確定する（Stripe）。カードの問題などで確定できなければ false */
  capturePaymentIntent: (paymentIntentId: string, idempotencyKey: string) => Promise<boolean>
  /** 月額：初月のカードでサブスクリプションを始める（Stripe。同じ申し込みでは1つだけ） */
  startSubscription: (input: StartSubscriptionInput) => Promise<{ subscriptionId: string }>
  /** 支払い済みにする（Stripe の顧客・支払いの ID は仮押さえのときに保存済み） */
  markPurchaseCaptured: (
    purchaseId: string,
    payment: { stripeSubscriptionId: string | null }
  ) => Promise<void>
  /** Stripe を通っていない申し込み（開発用）でも進めてよいか。本番では false */
  allowWithoutStripe: boolean
}>

export type CapturePurchaseError = 'not_found' | 'not_authorized' | 'capture_failed'

export type CapturePurchase = (
  params: Readonly<{ purchaseId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ purchaseId: string }, CapturePurchaseError>>

/**
 * コーチが承認した申し込みの、仮押さえした支払いを確定する（thread の承認から呼ぶ）
 *
 * ドメインルール:
 * - 仮押さえした申し込みだけ。確定済みなら何もしない（同じ承認を2回送っても1回だけ請求する）
 * - 月額は、初月を確定したあと同じカードでサブスクリプションを始める。2回目の請求は初月のスレッドが
 *   終わる日（承認から30日後）。途中で失敗しても、もう一度承認すれば続きから進む（Stripe の冪等キー）
 */
export const capturePurchase: CapturePurchase = async ({ purchaseId, now }, deps) => {
  const purchase = await deps.findPurchase(purchaseId)
  if (!purchase) {
    return err('not_found')
  }
  if (purchase.status === 'paid') {
    return ok({ purchaseId })
  }
  if (purchase.status !== 'authorized') {
    return err('not_authorized')
  }
  const paymentIntentId = purchase.stripePaymentIntentId
  if (paymentIntentId === null) {
    if (!deps.allowWithoutStripe) {
      return err('capture_failed')
    }
    await deps.markPurchaseCaptured(purchase.id, { stripeSubscriptionId: null })
    return ok({ purchaseId })
  }

  const captured = await deps.capturePaymentIntent(paymentIntentId, `capture-${purchase.id}`)
  if (!captured) {
    return err('capture_failed')
  }
  const subscription =
    purchase.planKind === 'monthly'
      ? await deps.startSubscription({
          purchaseId: purchase.id,
          paymentIntentId,
          priceYen: purchase.priceYen,
          systemFeeYen: purchase.systemFeeYen,
          firstRenewalAt: calcThreadPeriod(now).expiresAt,
        })
      : null
  await deps.markPurchaseCaptured(purchase.id, {
    stripeSubscriptionId: subscription?.subscriptionId ?? null,
  })
  return ok({ purchaseId })
}
