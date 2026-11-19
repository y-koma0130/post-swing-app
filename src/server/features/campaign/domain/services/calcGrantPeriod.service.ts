import { addDays, type LocalDate } from '@/server/utils/localDate'
import type { GrantPeriod } from '../values/CoachFeeGrant'

export type CalcGrantPeriod = (
  input: Readonly<{ startDate: LocalDate; durationDays: number }>
) => GrantPeriod

/**
 * 特典の期間
 *
 * ドメインルール:
 * - 始まる日を1日目として durationDays 日間（両端を含む）。90日なら、最終日は89日後
 */
export const calcGrantPeriod: CalcGrantPeriod = ({ startDate, durationDays }) => ({
  startDate,
  endDate: addDays(startDate, durationDays - 1),
})
