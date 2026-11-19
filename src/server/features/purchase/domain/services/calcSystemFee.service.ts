import { PURCHASE_RULES } from '../rules'

export type CalcSystemFee = (priceYen: number) => number

/**
 * 生徒が価格とは別に払うシステム利用料（円）
 *
 * ドメインルール:
 * - 価格の5%と200円の高いほう。円未満は切り捨て（生徒に不利にならないように）
 * - 申し込んだ時点の価格で決め、申し込みに保存する（月額は値下げのときだけ計算し直す）
 */
export const calcSystemFee: CalcSystemFee = (priceYen) =>
  Math.max(PURCHASE_RULES.systemFee.minYen, Math.floor(priceYen * PURCHASE_RULES.systemFee.rate))
