/** 管理画面のコーチの数（デモのコーチは数えない） */
export type AdminCoachStatsDto = {
  /** 招待したコーチ */
  total: number
  /** 申し込みを受けられる（口座の登録が済み、止めていない） */
  accepting: number
  /** 口座の登録がまだ */
  payoutPending: number
  /** 管理者が受付を止めている */
  suspended: number
}
