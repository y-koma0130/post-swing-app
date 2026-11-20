import 'server-only'
import { and, eq, inArray, isNull, type SQL } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { reply, retakeRequest, submission, thread } from '@/server/db/schema'

/** まだ添削していない提出と、返事の期限を決めるのに要る事実（calcReplyDueAt・replyClockStart に渡す） */
export type UnrepliedSubmission = Readonly<{
  submissionId: string
  threadId: string
  coachUserId: string
  submittedAt: Date
  threadStartedAt: Date
  /** 撮り直しをお願いしていて、まだ返事がない（返信の期限は止まっている） */
  retakeOpen: boolean
  /** いちばん最後に撮り直しのお願いが終わった日時（期限はそこから数え直す。なければ null） */
  lastRetakeClosedAt: Date | null
}>

/**
 * まだ添削していない提出（where で絞る）。毎日の返信の遅れのお知らせと、レッスンの一覧の返事の目安で、
 * 同じ数え方をするために1か所にまとめる
 */
export const findUnrepliedSubmissions = async (
  where: SQL | undefined
): Promise<UnrepliedSubmission[]> => {
  const db = getDb()
  const rows = await db
    .select({
      submissionId: submission.id,
      threadId: submission.threadId,
      coachUserId: thread.coachUserId,
      submittedAt: submission.submittedAt,
      threadStartedAt: thread.startedAt,
    })
    .from(submission)
    .innerJoin(thread, eq(thread.id, submission.threadId))
    .leftJoin(reply, eq(reply.submissionId, submission.id))
    .where(and(isNull(reply.id), where))
    .all()
  if (rows.length === 0) return []
  const requests = await db
    .select({ submissionId: retakeRequest.submissionId, closedAt: retakeRequest.closedAt })
    .from(retakeRequest)
    .where(
      inArray(
        retakeRequest.submissionId,
        rows.map((r) => r.submissionId)
      )
    )
    .all()
  return rows.map((row) => {
    const mine = requests.filter((r) => r.submissionId === row.submissionId)
    const closedTimes = mine.flatMap((r) => (r.closedAt ? [r.closedAt.getTime()] : []))
    return {
      ...row,
      retakeOpen: mine.some((r) => r.closedAt === null),
      lastRetakeClosedAt: closedTimes.length > 0 ? new Date(Math.max(...closedTimes)) : null,
    }
  })
}
