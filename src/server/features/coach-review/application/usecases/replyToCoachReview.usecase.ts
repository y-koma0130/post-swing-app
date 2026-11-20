import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkReviewReply,
  type ReviewReplyBlocker,
} from '../../domain/services/checkReviewReply.service'

type Dependencies = Readonly<{
  findReviewByThread: (threadId: string) => Promise<{
    id: string
    coachUserId: string
    studentUserId: string
    replied: boolean
  } | null>
  saveReviewReply: (reviewId: string, reply: string, at: Date) => Promise<void>
  /** 生徒に、コーチから返信が届いたことを知らせる（LINE。レッスンの画面で読める） */
  notifyReviewReplied: (input: { threadId: string; studentUserId: string }) => Promise<void>
}>

export type ReplyToCoachReview = (
  params: Readonly<{ actor: Actor; threadId: string; reply: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | ReviewReplyBlocker>>

/**
 * コーチがレビューに返信する（担当のコーチだけ・1回だけ）。
 * 返信は、生徒のレッスンの画面と受付ページのレビューに出る。生徒には LINE で知らせる
 */
export const replyToCoachReview: ReplyToCoachReview = async (params, deps) => {
  const review = await deps.findReviewByThread(params.threadId)
  if (!review || review.coachUserId !== params.actor.userId) return err('not_found')
  const blocker = checkReviewReply(review)
  if (blocker) return err(blocker)
  await deps.saveReviewReply(review.id, params.reply, params.now)
  await deps.notifyReviewReplied({ threadId: params.threadId, studentUserId: review.studentUserId })
  return ok(undefined)
}
