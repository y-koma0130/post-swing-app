export const PURCHASE_RULES = {
  /** プラットフォームの手数料（決済手数料込み） */
  platformFeeRate: 0.1,
  /**
   * 生徒が申し込みごとに別に払うシステム利用料（税込）。月額は毎月。
   * コーチの売上（価格から手数料を引いた分）には影響しない
   */
  systemFeeYen: 200,
} as const
