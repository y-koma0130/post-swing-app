import { mockThreads } from '@/server/mocks/fixtures'
import type { ThreadSummaryDto } from '../../application/dto/ThreadSummary.dto'

export type ListThreadSummariesByCoach = (coachSlug: string) => Promise<ThreadSummaryDto[]>

/**
 * コーチのスレッド一覧を、返信待ち→期限が近い順で取得
 *
 * MOC: 固定データから返す。段階1で D1 に差し替える
 */
export const listThreadSummariesByCoach: ListThreadSummariesByCoach = async (coachSlug) =>
  mockThreads
    .filter((t) => t.coachSlug === coachSlug)
    .toSorted((a, b) => {
      const priority = Number(b.status === 'waiting_coach') - Number(a.status === 'waiting_coach')
      return priority !== 0 ? priority : a.expiresAt.getTime() - b.expiresAt.getTime()
    })
    .map((t) => ({
      id: t.id,
      studentName: t.studentName,
      theme: t.theme,
      status: t.status,
      expiresAt: t.expiresAt,
    }))
