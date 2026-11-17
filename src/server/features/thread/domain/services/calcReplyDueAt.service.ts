import { AVAILABILITY_RULES } from '@/server/features/coach/domain/rules'
import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { addDays, startOfLocalDate, toLocalDate } from '@/server/utils/localDate'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type CalcReplyDueAt = (
  submittedAt: Date,
  absences: ReadonlyArray<Pick<CoachAbsence, 'startDate' | 'endDate'>>
) => Date

/**
 * 提出への添削の期限
 *
 * ドメインルール:
 * - 届いてから48時間（返信目安）
 * - コーチの不在中に届いた提出は、再開日（終了日の翌日、日本時間0時）から48時間
 */
export const calcReplyDueAt: CalcReplyDueAt = (submittedAt, absences) => {
  const day = toLocalDate(submittedAt)
  const absence = absences.find((a) => a.startDate <= day && day <= a.endDate)
  const from = absence ? startOfLocalDate(addDays(absence.endDate, 1)) : submittedAt
  return new Date(from.getTime() + AVAILABILITY_RULES.replyTargetHours * HOUR_MS)
}

/**
 * 返信の期限を数え始める時刻
 *
 * ドメインルール:
 * - 申し込みの最初の提出は、承認する前に届いている。期限は承認した時点（スレッドの開始）から数える
 */
export const replyClockStart = (submittedAt: Date, threadStartedAt: Date): Date =>
  submittedAt.getTime() >= threadStartedAt.getTime() ? submittedAt : threadStartedAt

/**
 * 毎日の処理で、コーチに返信の遅れを知らせるか
 * （毎日1回動くので、この1日のあいだに期限を過ぎたものだけ。1回の提出につき1回になる）
 */
export const isReplyDuePassedToday = (dueAt: Date, now: Date): boolean =>
  dueAt.getTime() <= now.getTime() && dueAt.getTime() > now.getTime() - DAY_MS
