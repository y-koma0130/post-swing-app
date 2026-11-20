import 'server-only'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachReview, reply, retakeRequest, submission } from '@/server/db/schema'

/** 一覧の1行に要る、添削を待っている提出のようす */
export type PendingReplyFacts = Readonly<{
  /** いちばん古い、まだ添削していない提出の時刻 */
  oldestUnrepliedAt: Date
  /** 撮り直しをお願いしていて、まだ届いていない（返信の期限は止まっている） */
  retakeOpen: boolean
  /** その提出の、いちばん最近に済んだ撮り直しの時刻（返信の期限はそこから数え直す） */
  lastRetakeClosedAt: Date | null
}>

/** スレッドごとの、まだ添削していない提出（なければ入らない） */
export const findPendingReplyFacts = async (
  threadIds: string[]
): Promise<Map<string, PendingReplyFacts>> => {
  if (threadIds.length === 0) return new Map()
  const db = getDb()
  const unreplied = await db
    .select({
      id: submission.id,
      threadId: submission.threadId,
      submittedAt: submission.submittedAt,
    })
    .from(submission)
    .leftJoin(reply, eq(reply.submissionId, submission.id))
    .where(and(inArray(submission.threadId, threadIds), isNull(reply.id)))
    .all()
  const oldest = new Map<string, (typeof unreplied)[number]>()
  for (const row of unreplied) {
    const current = oldest.get(row.threadId)
    if (!current || row.submittedAt < current.submittedAt) oldest.set(row.threadId, row)
  }
  const submissionIds = [...oldest.values()].map((s) => s.id)
  const retakes =
    submissionIds.length === 0
      ? []
      : await db
          .select({ submissionId: retakeRequest.submissionId, closedAt: retakeRequest.closedAt })
          .from(retakeRequest)
          .where(inArray(retakeRequest.submissionId, submissionIds))
          .all()
  return new Map(
    [...oldest.values()].map((s) => {
      const mine = retakes.filter((r) => r.submissionId === s.id)
      const closedTimes = mine.flatMap((r) => (r.closedAt ? [r.closedAt.getTime()] : []))
      return [
        s.threadId,
        {
          oldestUnrepliedAt: s.submittedAt,
          retakeOpen: mine.some((r) => r.closedAt === null),
          lastRetakeClosedAt: closedTimes.length > 0 ? new Date(Math.max(...closedTimes)) : null,
        },
      ]
    })
  )
}

/** レビューを書いたスレッド */
export const findReviewedThreadIds = async (threadIds: string[]): Promise<Set<string>> => {
  if (threadIds.length === 0) return new Set()
  const rows = await getDb()
    .select({ threadId: coachReview.threadId })
    .from(coachReview)
    .where(inArray(coachReview.threadId, threadIds))
    .all()
  return new Set(rows.map((r) => r.threadId))
}
