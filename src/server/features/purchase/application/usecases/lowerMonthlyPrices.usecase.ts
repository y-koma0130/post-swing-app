import { ok, type Result } from '@/server/utils/result'
import { calcSystemFee } from '../../domain/services/calcSystemFee.service'
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
    input: Readonly<{
      subscriptionId: string
      priceYen: number
      systemFeeYen: number
      platformFeeRate: number
    }>
  ) => Promise<boolean>
  /** いまのコーチの手数料率（キャンペーンの特典を含む。campaign） */
  resolveFeeAt: (coachUserId: string, at: Date) => Promise<Readonly<{ rate: number }>>
  savePurchasePrice: (
    purchaseId: string,
    price: Readonly<{ priceYen: number; systemFeeYen: number }>
  ) => Promise<void>
}>

export type LowerMonthlyPrices = (
  params: Readonly<{ coachUserId: string; monthlyPriceYen: number; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ lowered: number; failed: number }, never>>

/**
 * コーチが月額の価格を保存したあと、値下げなら、いまの生徒の月額にも次の請求から反映する
 * （どうするかは decideSubscriptionPrice。値上げは何もしない）。システム利用料も新しい価格で計算し直す
 * （価格の5%が200円を超えていた月額は、値下げで利用料も下がる。上がることはない）
 */
export const lowerMonthlyPrices: LowerMonthlyPrices = async (
  { coachUserId, monthlyPriceYen, now },
  deps
) => {
  // サブスクリプションの手数料の割合（予備。毎月の請求では請求書ごとに入れ直す）は、いまの率で計算する
  const { rate: platformFeeRate } = await deps.resolveFeeAt(coachUserId, now)
  let lowered = 0
  let failed = 0
  for (const sub of await deps.findActiveSubscriptions(coachUserId)) {
    const priceYen = decideSubscriptionPrice({
      currentPriceYen: sub.priceYen,
      newPlanPriceYen: monthlyPriceYen,
    })
    if (priceYen === null) continue
    const systemFeeYen = Math.min(sub.systemFeeYen, calcSystemFee(priceYen))
    const changed = await deps.changeSubscriptionPrice({
      subscriptionId: sub.subscriptionId,
      priceYen,
      systemFeeYen,
      platformFeeRate,
    })
    if (!changed) {
      failed += 1
      continue
    }
    await deps.savePurchasePrice(sub.purchaseId, { priceYen, systemFeeYen })
    lowered += 1
  }
  return ok({ lowered, failed })
}
