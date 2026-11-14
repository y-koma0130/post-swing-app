import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachReview, thread } from '@/server/db/schema'
import type { CoachReviewInput } from '../../domain/values/CoachReview'

export const findThreadForReview = async (threadId: string) => {
  const row = await getDb()
    .select({
      coachUserId: thread.coachUserId,
      studentUserId: thread.studentUserId,
      status: thread.status,
      reviewId: coachReview.id,
    })
    .from(thread)
    .leftJoin(coachReview, eq(coachReview.threadId, thread.id))
    .where(eq(thread.id, threadId))
    .get()
  if (!row) return null
  return {
    coachUserId: row.coachUserId,
    studentUserId: row.studentUserId,
    closed: row.status === 'closed',
    reviewed: row.reviewId !== null,
  }
}

export const saveReview = async (
  review: CoachReviewInput & {
    id: string
    threadId: string
    coachUserId: string
    studentUserId: string
    createdAt: Date
  }
) => {
  await getDb().insert(coachReview).values(review)
}

export const findReviewByThread = async (threadId: string) => {
  const row = await getDb()
    .select({
      id: coachReview.id,
      coachUserId: coachReview.coachUserId,
      coachReply: coachReview.coachReply,
    })
    .from(coachReview)
    .where(eq(coachReview.threadId, threadId))
    .get()
  return row ? { id: row.id, coachUserId: row.coachUserId, replied: row.coachReply !== null } : null
}

export const saveReviewReply = async (reviewId: string, reply: string, at: Date) => {
  await getDb()
    .update(coachReview)
    .set({ coachReply: reply, repliedAt: at })
    .where(eq(coachReview.id, reviewId))
}
