import { PURCHASE_RULES } from '../rules'

export type CalcPlatformFee = (priceYen: number) => number

/**
 * 1回の支払いのうち、プラットフォームが受け取る額（円）
 *
 * ドメインルール:
 * - 価格の10%。円未満は切り捨て（コーチに不利にならないように）
 */
export const calcPlatformFee: CalcPlatformFee = (priceYen) =>
  Math.floor(priceYen * PURCHASE_RULES.platformFeeRate)
