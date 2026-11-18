export const PURCHASE_RULES = {
  /** プラットフォームの手数料（決済手数料込み） */
  platformFeeRate: 0.1,
  /**
   * 生徒が申し込みごとに別に払うシステム利用料（税込）。月額は毎月。
   * 価格の5%（円未満切り捨て）と200円の高いほう（calcSystemFee）。
   * コーチの売上（価格から手数料を引いた分）には影響しない
   */
  systemFee: { minYen: 200, rate: 0.05 },
} as const
