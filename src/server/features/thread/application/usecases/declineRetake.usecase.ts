import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { findRespondableRetake } from '../../domain/services/findRespondableRetake.service'
import type { RetakeRequest } from '../../domain/values/RetakeRequest'
import type { Thread } from '../../domain/values/Thread'

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findRetakeRequests: (threadId: string) => Promise<RetakeRequest[]>
  /** お願いを「生徒が今は撮れない」で終える */
  closeRetakeRequest: (input: { requestId: string; closedAt: Date }) => Promise<void>
  /** コーチに「今は撮れない」と知らせる（いまの動画で添削してもらう） */
  notifyRetakeDeclined: (input: { threadId: string; coachUserId: string }) => Promise<void>
}>

export type DeclineRetake = (
  params: Readonly<{ actor: Actor; threadId: string; requestId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | 'no_retake'>>

/**
 * 生徒が「今は撮れない」と返す（本人の生徒だけ）。お願いは終わり、コーチはいまの動画で添削する。
 * 返信の期限は、この時点から数え直す
 */
export const declineRetake: DeclineRetake = async ({ actor, threadId, requestId, now }, deps) => {
  const thread = await deps.findThread(threadId)
  if (!thread || thread.studentUserId !== actor.userId) {
    return err('not_found')
  }
  const request = findRespondableRetake({
    threadStatus: thread.status,
    requests: await deps.findRetakeRequests(thread.id),
    requestId,
  })
  if (!request) {
    return err('no_retake')
  }
  await deps.closeRetakeRequest({ requestId: request.id, closedAt: now })
  await deps.notifyRetakeDeclined({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok(undefined)
}
