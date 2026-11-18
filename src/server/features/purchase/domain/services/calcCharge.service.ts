import { calcPlatformFee } from './calcPlatformFee.service'

export type ChargeInput = Readonly<{
  priceYen: number
  systemFeeYen: number
  /** その支払いに使う手数料率（基本10%。キャンペーンの特典で下がる） */
  platformFeeRate: number
}>

export type Charge = Readonly<{
  /** 生徒が払う合計（価格＋システム利用料） */
  totalYen: number
  /** 価格に対する手数料 */
  platformFeeYen: number
  /** プラットフォームの取り分（価格の手数料＋システム利用料）。残りがコーチの売上 */
  applicationFeeYen: number
}>

export type CalcCharge = (input: ChargeInput) => Charge

/**
 * 1回の支払いの内訳
 *
 * ドメインルール:
 * - 生徒は価格にシステム利用料を足して払う
 * - コーチの売上は価格から手数料を引いた分。システム利用料はすべてプラットフォームが受け取る
 */
export const calcCharge: CalcCharge = ({ priceYen, systemFeeYen, platformFeeRate }) => {
  const platformFeeYen = calcPlatformFee({ priceYen, platformFeeRate })
  return {
    totalYen: priceYen + systemFeeYen,
    platformFeeYen,
    applicationFeeYen: platformFeeYen + systemFeeYen,
  }
}

export type CalcSubscriptionFeePercent = (input: ChargeInput) => number

/**
 * 月額の毎月の請求で、プラットフォームが受け取る割合（%）
 *
 * ドメインルール:
 * - サブスクリプションの手数料は割合でしか指定できない（Stripe）。毎月の取り分が calcCharge と
 *   同じになるよう、合計に対する割合にする（小数2桁まで。1円未満のずれは出る）
 * - 毎月の請求では、請求書ごとに額を入れ直す（invoice.created）。この割合は届かなかったときの予備
 */
export const calcSubscriptionFeePercent: CalcSubscriptionFeePercent = (input) => {
  const { totalYen, applicationFeeYen } = calcCharge(input)
  return Math.round((applicationFeeYen / totalYen) * 10000) / 100
}
