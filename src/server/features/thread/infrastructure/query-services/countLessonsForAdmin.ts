import 'server-only'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, thread } from '@/server/db/schema'
import type { AdminLessonStatsDto } from '../../application/dto/AdminLessonStats.dto'
import { IN_LESSON_STATUSES } from '../../domain/rules'

/** 承認して始まったレッスン（レッスン中・終わったもの） */
const STARTED_STATUSES = [...IN_LESSON_STATUSES, 'closed'] as const

export type CountLessonsForAdmin = (monthStart: Date) => Promise<AdminLessonStatsDto>

/**
 * 管理画面のレッスンと生徒の数。monthStart（日本時間の今月1日0時）から「今月」を数える。
 * デモのコーチ（staging でコーチ候補が試すもの）のレッスンは数えない
 */
export const countLessonsForAdmin: CountLessonsForAdmin = async (monthStart) => {
  const db = getDb()
  const notDemo = isNull(coachProfile.demoExpiresAt)
  const since = monthStart.getTime()
  const [lessons, students, firstStarts] = await Promise.all([
    db
      .select({
        requested: sql<number>`coalesce(sum(case when ${thread.status} = 'requested' then 1 else 0 end), 0)`,
        inLesson: sql<number>`coalesce(sum(case when ${thread.status} in ('waiting_coach', 'waiting_student') then 1 else 0 end), 0)`,
        startedThisMonth: sql<number>`coalesce(sum(case when ${thread.status} in ('waiting_coach', 'waiting_student', 'closed') and ${thread.startedAt} >= ${since} then 1 else 0 end), 0)`,
        finished: sql<number>`coalesce(sum(case when ${thread.status} = 'closed' then 1 else 0 end), 0)`,
      })
      .from(thread)
      .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
      .where(notDemo)
      .get(),
    db
      .select({
        total: sql<number>`count(distinct ${thread.studentUserId})`,
        active: sql<number>`count(distinct case when ${thread.status} in ('waiting_coach', 'waiting_student') then ${thread.studentUserId} end)`,
      })
      .from(thread)
      .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
      .where(and(notDemo, inArray(thread.status, [...STARTED_STATUSES])))
      .get(),
    // 生徒ごとの、はじめてレッスンを始めた時刻（それが今月なら、今月の新しい生徒）
    db
      .select({ first: sql<number>`min(${thread.startedAt})` })
      .from(thread)
      .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
      .where(and(notDemo, inArray(thread.status, [...STARTED_STATUSES])))
      .groupBy(thread.studentUserId)
      .all(),
  ])
  return {
    lessons: lessons ?? { requested: 0, inLesson: 0, startedThisMonth: 0, finished: 0 },
    students: {
      total: students?.total ?? 0,
      active: students?.active ?? 0,
      newThisMonth: firstStarts.filter((s) => s.first >= since).length,
    },
  }
}
