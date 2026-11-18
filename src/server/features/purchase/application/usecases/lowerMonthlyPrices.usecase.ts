import { ok, type Result } from '@/server/utils/result'
import { decideSubscriptionPrice } from '../../domain/services/decideSubscriptionPrice.service'

export type ActiveSubscription = Readonly<{
  purchaseId: string
  subscriptionId: string
  priceYen: number
  systemFeeYen: number
}>

type Dependencies = Readonly<{
  /** このコーチの、続いている月額（支払い済みで解約されていないもの） */
  findActiveSubscriptions: (coachUserId: string) => Promise<ActiveSubscription[]>
  /** 次の請求からの価格を変える（Stripe）。変えられなければ false */
  changeSubscriptionPrice: (
    input: Readonly<{ subscriptionId: string; priceYen: number; systemFeeYen: number }>
  ) => Promise<boolean>
  savePurchasePrice: (purchaseId: string, priceYen: number) => Promise<void>
}>

export type LowerMonthlyPrices = (
  params: Readonly<{ coachUserId: string; monthlyPriceYen: number }>,
  dependencies: Dependencies
) => Promise<Result<{ lowered: number; failed: number }, never>>

/**
 * コーチが月額の価格を保存したあと、値下げなら、いまの生徒の月額にも次の請求から反映する
 * （どうするかは decideSubscriptionPrice。値上げは何もしない）
 */
export const lowerMonthlyPrices: LowerMonthlyPrices = async (
  { coachUserId, monthlyPriceYen },
  deps
) => {
  let lowered = 0
  let failed = 0
  for (const sub of await deps.findActiveSubscriptions(coachUserId)) {
    const priceYen = decideSubscriptionPrice({
      currentPriceYen: sub.priceYen,
      newPlanPriceYen: monthlyPriceYen,
    })
    if (priceYen === null) continue
    const changed = await deps.changeSubscriptionPrice({
      subscriptionId: sub.subscriptionId,
      priceYen,
      systemFeeYen: sub.systemFeeYen,
    })
    if (!changed) {
      failed += 1
      continue
    }
    await deps.savePurchasePrice(sub.purchaseId, priceYen)
    lowered += 1
  }
  return ok({ lowered, failed })
}
