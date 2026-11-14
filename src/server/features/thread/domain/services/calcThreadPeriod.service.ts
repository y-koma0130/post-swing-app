import { THREAD_RULES } from '../rules'

const DAY_MS = 24 * 60 * 60 * 1000

export type CalcThreadPeriod = (startedAt: Date) => { startedAt: Date; expiresAt: Date }

/**
 * スレッドの期間
 *
 * ドメインルール:
 * - 開始から30日
 */
export const calcThreadPeriod: CalcThreadPeriod = (startedAt) => ({
  startedAt,
  expiresAt: new Date(startedAt.getTime() + THREAD_RULES.durationDays * DAY_MS),
})
