/** 管理画面のコーチ一覧の1行 */
export type AdminCoachRowDto = {
  userId: string
  email: string
  name: string
  slug: string
  chargesEnabled: boolean
  invitedAt: Date
}
