import 'server-only'
import { inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachReview, submission } from '@/server/db/schema'
import { findUnrepliedSubmissions } from './unrepliedSubmissions'

/** 一覧の1行に要る、添削を待っている提出のようす */
export type PendingReplyFacts = Readonly<{
  /** いちばん古い、まだ添削していない提出の時刻 */
  oldestUnrepliedAt: Date
  /** 撮り直しをお願いしていて、まだ届いていない（返信の期限は止まっている） */
  retakeOpen: boolean
  /** その提出の、いちばん最近に済んだ撮り直しの時刻（返信の期限はそこから数え直す） */
  lastRetakeClosedAt: Date | null
}>

/** スレッドごとの、いちばん古い、まだ添削していない提出（なければ入らない） */
export const findPendingReplyFacts = async (
  threadIds: string[]
): Promise<Map<string, PendingReplyFacts>> => {
  if (threadIds.length === 0) return new Map()
  const oldest = new Map<string, PendingReplyFacts>()
  for (const s of await findUnrepliedSubmissions(inArray(submission.threadId, threadIds))) {
    const current = oldest.get(s.threadId)
    if (current && current.oldestUnrepliedAt <= s.submittedAt) continue
    oldest.set(s.threadId, {
      oldestUnrepliedAt: s.submittedAt,
      retakeOpen: s.retakeOpen,
      lastRetakeClosedAt: s.lastRetakeClosedAt,
    })
  }
  return oldest
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
