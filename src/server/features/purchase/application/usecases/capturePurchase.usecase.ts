import { calcThreadPeriod } from '@/server/features/thread/domain/services/calcThreadPeriod.service'
import { err, ok, type Result } from '@/server/utils/result'
import { calcCharge } from '../../domain/services/calcCharge.service'
import { type Payment, paymentIdFor } from '../../domain/values/Payment'
import { needsPayment, type Purchase } from '../../domain/values/Purchase'

export type StartSubscriptionInput = Readonly<{
  purchaseId: string
  /** 初月の支払い（ここから顧客・保存したカード・送金先を引き継ぐ） */
  paymentIntentId: string
  priceYen: number
  systemFeeYen: number
  /** サブスクリプションの手数料の割合に使う率（作る時点の率。毎月の請求では入れ直す） */
  platformFeeRate: number
  /** 2回目の請求日 */
  firstRenewalAt: Date
}>

/** その時点のコーチの手数料率と、使った特典 */
export type FeeRate = Readonly<{ rate: number; grantId: string | null }>

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  /** 承認するときの手数料率（始まっていない特典も、承認した日から始まるものとして数える。campaign） */
  resolveFeeOnApproval: (coachUserId: string, approvedAt: Date) => Promise<FeeRate>
  /** 仮押さえした支払いを、この手数料で確定する（Stripe）。カードの問題などで確定できなければ false */
  capturePaymentIntent: (
    input: Readonly<{ paymentIntentId: string; applicationFeeYen: number; idempotencyKey: string }>
  ) => Promise<boolean>
  /** 確定したら、始まっていない特典を始める（campaign） */
  startGrantsOnApproval: (coachUserId: string, approvedAt: Date) => Promise<unknown>
  /** 月額：初月のカードでサブスクリプションを始める（Stripe。同じ申し込みでは1つだけ） */
  startSubscription: (input: StartSubscriptionInput) => Promise<{ subscriptionId: string }>
  /** 支払いを記録する（同じ id なら何もしない） */
  savePayment: (payment: Payment) => Promise<void>
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
 * - 手数料は承認した時点の率（キャンペーンの特典を含む）。初めての承認で、始まっていない特典が始まり、
 *   その承認も特典の対象になる。確定できなかったら特典は始めない
 * - 月額は、初月を確定したあと同じカードでサブスクリプションを始める。2回目の請求は初月のスレッドが
 *   終わる日（承認から30日後）。途中で失敗しても、もう一度承認すれば続きから進む（Stripe の冪等キー）
 * - 無料のモニター（0円）は、Stripe を通さずに確定する（手数料も0円で記録する）
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
  // 無料のモニターは、Stripe を通さずに確定する
  if (paymentIntentId === null && needsPayment(purchase) && !deps.allowWithoutStripe) {
    return err('capture_failed')
  }

  const fee = await deps.resolveFeeOnApproval(purchase.coachUserId, now)
  const charge = calcCharge({ ...purchase, platformFeeRate: fee.rate })
  if (paymentIntentId !== null) {
    const captured = await deps.capturePaymentIntent({
      paymentIntentId,
      applicationFeeYen: charge.applicationFeeYen,
      // 手数料が変わったら別の要求になる（同じキーで違う内容を送ると Stripe が断るため）
      idempotencyKey: `capture-${purchase.id}-${charge.applicationFeeYen}`,
    })
    if (!captured) {
      return err('capture_failed')
    }
  }
  await deps.startGrantsOnApproval(purchase.coachUserId, now)
  await deps.savePayment({
    id: paymentIdFor({ kind: 'capture', purchaseId: purchase.id }),
    purchaseId: purchase.id,
    coachUserId: purchase.coachUserId,
    kind: 'capture',
    priceYen: purchase.priceYen,
    systemFeeYen: purchase.systemFeeYen,
    platformFeeRate: fee.rate,
    platformFeeYen: charge.platformFeeYen,
    feeGrantId: fee.grantId,
    feeAdjustedYen: 0,
    stripePaymentIntentId: paymentIntentId,
    stripeInvoiceId: null,
    paidAt: now,
  })

  const subscription =
    purchase.planKind === 'monthly' && paymentIntentId !== null
      ? await deps.startSubscription({
          purchaseId: purchase.id,
          paymentIntentId,
          priceYen: purchase.priceYen,
          systemFeeYen: purchase.systemFeeYen,
          platformFeeRate: fee.rate,
          firstRenewalAt: calcThreadPeriod(now).expiresAt,
        })
      : null
  await deps.markPurchaseCaptured(purchase.id, {
    stripeSubscriptionId: subscription?.subscriptionId ?? null,
  })
  return ok({ purchaseId })
}
