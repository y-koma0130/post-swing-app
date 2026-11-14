import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  findReviewByThread: (threadId: string) => Promise<{
    id: string
    coachUserId: string
    replied: boolean
  } | null>
  saveReviewReply: (reviewId: string, reply: string, at: Date) => Promise<void>
}>

export type ReplyToCoachReview = (
  params: Readonly<{ actor: Actor; threadId: string; reply: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | 'already_replied'>>

/** コーチがレビューに返信する（受付ページに一緒に出る） */
export const replyToCoachReview: ReplyToCoachReview = async (params, deps) => {
  const review = await deps.findReviewByThread(params.threadId)
  if (!review || review.coachUserId !== params.actor.userId) return err('not_found')
  if (review.replied) return err('already_replied')
  await deps.saveReviewReply(review.id, params.reply, params.now)
  return ok(undefined)
}
