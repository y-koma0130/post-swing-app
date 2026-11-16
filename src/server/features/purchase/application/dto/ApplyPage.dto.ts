import type { CoachProfileDto } from '@/server/features/coach/application/dto/CoachProfile.dto'

/** 申し込み画面 */
export type ApplyPageDto = {
  coach: CoachProfileDto
  isFull: boolean
  /** ログインしている生徒について */
  student: { trialUsed: boolean; subscribed: boolean; onWaitlist: boolean } | null
}
