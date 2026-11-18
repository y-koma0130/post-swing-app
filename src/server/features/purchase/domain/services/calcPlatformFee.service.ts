export type CalcPlatformFee = (
  input: Readonly<{ priceYen: number; platformFeeRate: number }>
) => number

/**
 * 1回の支払いのうち、価格に対するプラットフォームの手数料（円）
 *
 * ドメインルール:
 * - 価格 × 手数料率。率は基本10%で、キャンペーンの特典があれば下がる（campaign の resolveCoachFeeRate）
 * - 円未満は切り捨て（コーチに不利にならないように）
 */
export const calcPlatformFee: CalcPlatformFee = ({ priceYen, platformFeeRate }) =>
  Math.floor(priceYen * platformFeeRate)
