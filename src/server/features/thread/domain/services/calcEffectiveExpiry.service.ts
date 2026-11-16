import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { overlapDays, toLocalDate } from '@/server/utils/localDate'
import type { Thread } from '../values/Thread'

const DAY_MS = 24 * 60 * 60 * 1000

export type EffectiveExpiry = Readonly<{
  expiresAt: Date
  /** 不在のために延びた日数 */
  extendedDays: number
}>

export type CalcEffectiveExpiry = (
  thread: Pick<Thread, 'startedAt' | 'expiresAt'>,
  absences: ReadonlyArray<Pick<CoachAbsence, 'startDate' | 'endDate'>>
) => EffectiveExpiry

/**
 * 不在を考えた、実際の期限（保存した期限は書き換えない）
 *
 * ドメインルール:
 * - 期間中に重なったコーチの不在日数だけ、期限を延ばす
 * - 延ばした先でさらに不在と重なれば、その分も延ばす（増えなくなるまで繰り返す）
 * - 日付は日本時間で数える
 */
export const calcEffectiveExpiry: CalcEffectiveExpiry = (thread, absences) => {
  const start = toLocalDate(thread.startedAt)
  let extendedDays = 0
  // 不在の日数は有限なので、延ばす日数はいずれ増えなくなる
  for (;;) {
    const expiresAt = new Date(thread.expiresAt.getTime() + extendedDays * DAY_MS)
    const end = toLocalDate(expiresAt)
    const overlapped = absences.reduce(
      (sum, a) => sum + overlapDays({ start, end }, { start: a.startDate, end: a.endDate }),
      0
    )
    if (overlapped === extendedDays) return { expiresAt, extendedDays }
    extendedDays = overlapped
  }
}

/** 実際の期限に置き換えたスレッド（期限で判定する domain の関数に渡す） */
export const withEffectiveExpiry = <T extends Pick<Thread, 'startedAt' | 'expiresAt'>>(
  thread: T,
  absences: ReadonlyArray<Pick<CoachAbsence, 'startDate' | 'endDate'>>
): T => ({ ...thread, expiresAt: calcEffectiveExpiry(thread, absences).expiresAt })
