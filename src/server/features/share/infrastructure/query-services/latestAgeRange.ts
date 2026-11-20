import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { thread } from '@/server/db/schema'
import { type AgeRange, ageRangeSchema } from '@/server/features/thread/domain/values/GolfProfile'

export type FindLatestAgeRange = (
  studentUserId: string,
  coachUserId: string
) => Promise<{ ageRange: AgeRange | null } | null>
/** この生徒がこのコーチに申し込んだ、いちばん新しいレッスンの年代（申し込みがなければ null） */
export const findLatestAgeRange: FindLatestAgeRange = async (studentUserId, coachUserId) => {
  const row = await getDb()
    .select({ ageRange: thread.ageRange })
    .from(thread)
    .where(and(eq(thread.studentUserId, studentUserId), eq(thread.coachUserId, coachUserId)))
    .orderBy(desc(thread.startedAt))
    .get()
  if (!row) return null
  const parsed = ageRangeSchema.safeParse(row.ageRange)
  return { ageRange: parsed.success ? parsed.data : null }
}
