import type { Coach } from '../values/Coach'

export type CalcRemainingCapacity = (
  coach: Pick<Coach, 'monthlyCapacity'>,
  activeThreadCount: number
) => number

/**
 * 今月の受付枠の残りを計算する
 *
 * ドメインルール:
 * - 残りは0未満にならない（満枠ならキャンセル待ち）
 */
export const calcRemainingCapacity: CalcRemainingCapacity = (coach, activeThreadCount) =>
  Math.max(coach.monthlyCapacity - activeThreadCount, 0)
