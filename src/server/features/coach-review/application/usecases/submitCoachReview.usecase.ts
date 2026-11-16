import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkReviewSubmission,
  type ReviewBlocker,
} from '../../domain/services/checkReviewSubmission.service'
import type { CoachReviewInput } from '../../domain/values/CoachReview'

type Dependencies = Readonly<{
  findThreadForReview: (threadId: string) => Promise<{
    coachUserId: string
    studentUserId: string
    closed: boolean
    reviewed: boolean
  } | null>
  saveReview: (
    review: CoachReviewInput & {
      id: string
      threadId: string
      coachUserId: string
      studentUserId: string
      createdAt: Date
    }
  ) => Promise<void>
  generateId: () => string
}>

export type SubmitCoachReview = (
  params: Readonly<{ actor: Actor; threadId: string; review: CoachReviewInput; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | ReviewBlocker>>

/** 生徒が、終わったスレッドのコーチをレビューする */
export const submitCoachReview: SubmitCoachReview = async (params, deps) => {
  const thread = await deps.findThreadForReview(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) return err('not_found')
  const blocker = checkReviewSubmission(thread)
  if (blocker) return err(blocker)
  await deps.saveReview({
    ...params.review,
    id: deps.generateId(),
    threadId: params.threadId,
    coachUserId: thread.coachUserId,
    studentUserId: thread.studentUserId,
    createdAt: params.now,
  })
  return ok(undefined)
}
