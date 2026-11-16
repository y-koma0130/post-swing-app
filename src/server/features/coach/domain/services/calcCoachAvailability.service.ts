import { addDays, toLocalDate } from '@/server/utils/localDate'
import { AVAILABILITY_RULES } from '../rules'
import type { CoachAbsence } from '../values/CoachAbsence'
import type { CoachAvailability } from '../values/CoachAvailability'

const DAY_MS = 24 * 60 * 60 * 1000

/** 返信遅れフラグが、いま効いているか（立ててから7日で自動で外れる） */
export const isDelayFlagActive = (delayFlagSetAt: Date | null, now: Date): boolean =>
  delayFlagSetAt !== null &&
  now.getTime() < delayFlagSetAt.getTime() + AVAILABILITY_RULES.delayFlagDays * DAY_MS

/** 返信遅れフラグが自動で外れる時刻 */
export const delayFlagExpiresAt = (delayFlagSetAt: Date): Date =>
  new Date(delayFlagSetAt.getTime() + AVAILABILITY_RULES.delayFlagDays * DAY_MS)

export type CalcCoachAvailability = (
  input: Readonly<{
    absences: ReadonlyArray<CoachAbsence>
    delayFlagSetAt: Date | null
    now: Date
  }>
) => CoachAvailability

/**
 * コーチの今の状態。すべての画面・判定・通知はこれを使う
 *
 * ドメインルール:
 * - 不在 ＞ 返信遅れ ＞ 通常 の順に優先する
 * - 今日（日本時間）が開始日〜終了日に入っていれば不在。終了日の翌日から通常に戻る
 * - これから始まる不在は、まだ通常（予定は findUpcomingAbsence で別に出す）
 */
export const calcCoachAvailability: CalcCoachAvailability = ({ absences, delayFlagSetAt, now }) => {
  const today = toLocalDate(now)
  const current = absences.find((a) => a.startDate <= today && today <= a.endDate)
  if (current) {
    return { kind: 'absent', absence: current, resumeDate: addDays(current.endDate, 1) }
  }
  if (isDelayFlagActive(delayFlagSetAt, now)) return { kind: 'delayed' }
  return { kind: 'available', replyTargetHours: AVAILABILITY_RULES.replyTargetHours }
}
