import { addDays, toLocalDate } from '@/server/utils/localDate'
import { AVAILABILITY_RULES } from '../rules'
import type { CoachAbsence } from '../values/CoachAbsence'

export type FindUpcomingAbsence = (
  input: Readonly<{ absences: ReadonlyArray<CoachAbsence>; now: Date }>
) => CoachAbsence | null

/**
 * これから始まる不在のうち、いちばん近いもの（受付ページで前もって知らせる）
 *
 * ドメインルール:
 * - 明日から7日以内に始まるものだけ
 */
export const findUpcomingAbsence: FindUpcomingAbsence = ({ absences, now }) => {
  const today = toLocalDate(now)
  const limit = addDays(today, AVAILABILITY_RULES.upcomingNoticeDays)
  return (
    absences
      .filter((a) => a.startDate > today && a.startDate <= limit)
      .toSorted((a, b) => (a.startDate < b.startDate ? -1 : 1))[0] ?? null
  )
}
