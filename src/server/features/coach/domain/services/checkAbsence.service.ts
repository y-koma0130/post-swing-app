import { type LocalDate, overlapDays } from '@/server/utils/localDate'
import type { AbsenceInput, CoachAbsence } from '../values/CoachAbsence'

export type AbsenceBlocker = 'invalid_range' | 'past' | 'overlap'

export type CheckAbsence = (
  input: Readonly<{
    absence: Pick<AbsenceInput, 'startDate' | 'endDate'>
    /** 同じコーチのほかの不在期間（編集のときは、編集している不在を除く） */
    others: ReadonlyArray<Pick<CoachAbsence, 'startDate' | 'endDate'>>
    today: LocalDate
  }>
) => AbsenceBlocker | null

/**
 * 不在期間を保存できるか
 *
 * ドメインルール:
 * - 開始日は終了日より後にできない（同じ日は1日だけの不在）
 * - 終わってしまった期間は登録できない（終了日が今日より前）
 * - 同じコーチの不在期間は重ねられない
 */
export const checkAbsence: CheckAbsence = ({ absence, others, today }) => {
  if (absence.startDate > absence.endDate) return 'invalid_range'
  if (absence.endDate < today) return 'past'
  const range = { start: absence.startDate, end: absence.endDate }
  if (others.some((o) => overlapDays(range, { start: o.startDate, end: o.endDate }) > 0)) {
    return 'overlap'
  }
  return null
}
