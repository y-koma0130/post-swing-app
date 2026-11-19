export type CalcFeeAdjustment = (
  input: Readonly<{ chargedApplicationFeeYen: number; expectedApplicationFeeYen: number }>
) => number

/**
 * 月額の請求で、実際に取った Application Fee のうち、返して戻す額（円）
 *
 * ドメインルール:
 * - 請求書の手数料を入れ直せなかった（invoice.created が届かなかった）ときの予備
 * - 多く取っていたら差額を戻す。少なく取っていたら追加では取らない（コーチに不利な方向には直さない）
 */
export const calcFeeAdjustment: CalcFeeAdjustment = ({
  chargedApplicationFeeYen,
  expectedApplicationFeeYen,
}) => Math.max(0, chargedApplicationFeeYen - expectedApplicationFeeYen)
