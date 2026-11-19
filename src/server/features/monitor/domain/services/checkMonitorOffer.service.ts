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
