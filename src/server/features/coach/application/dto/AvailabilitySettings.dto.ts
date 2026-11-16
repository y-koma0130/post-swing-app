import type { CoachAvailabilityDto } from './CoachAvailability.dto'

/** 「不在・返信の設定」画面 */
export type AvailabilitySettingsDto = {
  availability: CoachAvailabilityDto
  /** 今とこれからの不在（終わったものは出さない） */
  absences: Array<{
    id: string
    startDate: string
    endDate: string
    note: string
    pauseNewSignups: boolean
    current: boolean
  }>
  delayFlag: { active: boolean; expiresAt: Date | null }
  replyTargetHours: number
  noteMaxLength: number
  /** 今日（日本時間）。日付の入力の最小値に使う */
  today: string
}
