/** 管理画面のデモの欄（デモを使えない環境では enabled が false で、欄を出さない） */
export type AdminDemoCoachesDto = {
  enabled: boolean
  /** 期限が近い順 */
  coaches: Array<{ userId: string; name: string; expiresAt: Date }>
}
