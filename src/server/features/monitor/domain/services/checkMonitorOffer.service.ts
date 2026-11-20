import { err, ok, type Result } from '@/server/utils/result'
import { MONITOR_RULES } from '../rules'
import type { MonitorOffer } from '../values/MonitorCode'

export type MonitorOfferBlocker = 'price_not_discounted' | 'price_below_minimum'

export type CheckMonitorOffer = (
  input: Readonly<{ offer: MonitorOffer; singlePriceYen: number }>
) => Result<MonitorOffer, MonitorOfferBlocker>

/**
 * コーチが決めたモニター募集の内容を、保存してよいか
 *
 * ドメインルール:
 * - 対象は1レッスンだけ。モニター価格は、1レッスンの通常価格より安くする
 * - 無料（0円）か、Stripe で払える最低額（50円）以上
 */
export const checkMonitorOffer: CheckMonitorOffer = ({ offer, singlePriceYen }) => {
  if (offer.priceYen >= singlePriceYen) return err('price_not_discounted')
  if (offer.priceYen !== 0 && offer.priceYen < MONITOR_RULES.minPaidPriceYen) {
    return err('price_below_minimum')
  }
  return ok(offer)
}

export type MonitorOfferChangeBlocker = 'price_locked' | 'max_uses_below_used'

export type CheckMonitorOfferChange = (
  input: Readonly<{ current: MonitorOffer; next: MonitorOffer; usedCount: number }>
) => Result<MonitorOffer, MonitorOfferChangeBlocker>

/**
 * 作ったあとのコードの内容を変えてよいか
 *
 * ドメインルール:
 * - 価格（無料か割引か・金額）は変えられない。コードは「先着〇名無料」のような告知と一緒に伝わっているので、
 *   変えるとその告知と食い違う。価格を変えたいときは、止めて新しいコードを作る
 * - 先着の人数は、すでに申し込んだ数より少なくできない
 * - 呼び名・期限は自由に変えられる
 */
export const checkMonitorOfferChange: CheckMonitorOfferChange = ({ current, next, usedCount }) => {
  if (next.priceYen !== current.priceYen) return err('price_locked')
  if (next.maxUses < usedCount) return err('max_uses_below_used')
  return ok(next)
}
