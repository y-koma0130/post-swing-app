import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkRetakeRequest,
  type RetakeRequestBlocker,
} from '../../domain/services/checkRetakeRequest.service'
import {
  type RetakeReason,
  type RetakeRequest,
  retakeMessageSchema,
  retakeReasonSchema,
} from '../../domain/values/RetakeRequest'
import type { Thread } from '../../domain/values/Thread'

export type NewRetakeRequest = Readonly<{
  id: string
  threadId: string
  submissionId: string
  reason: RetakeReason
  message: string
  requestedAt: Date
}>

export type RequestRetakeParams = Readonly<{
  actor: Actor
  threadId: string
  submissionId: string
  reason: string
  message: string
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findRetakeRequests: (threadId: string) => Promise<RetakeRequest[]>
  saveRetakeRequest: (request: NewRetakeRequest) => Promise<void>
  /** 生徒に「撮り直しのお願い」を知らせる（キューに積むだけ） */
  notifyRetakeRequested: (input: { threadId: string; studentUserId: string }) => Promise<void>
  generateId: () => string
}>

export type RequestRetakeError =
  | 'not_found'
  | 'invalid_reason'
  | 'message_too_long'
  | RetakeRequestBlocker

export type RequestRetake = (
  params: RequestRetakeParams,
  dependencies: Dependencies
) => Promise<Result<{ requestId: string }, RequestRetakeError>>

/**
 * コーチが生徒に撮り直しをお願いする（担当のコーチだけ）。
 * 提出回数には数えず、元の動画はそのまま使える。お願いできるかは checkRetakeRequest で決める
 */
export const requestRetake: RequestRetake = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.coachUserId !== params.actor.userId) {
    return err('not_found')
  }
  const reason = retakeReasonSchema.safeParse(params.reason)
  if (!reason.success) return err('invalid_reason')
  const message = retakeMessageSchema.safeParse(params.message)
  if (!message.success) return err('message_too_long')
  const blocker = checkRetakeRequest({
    thread,
    requests: await deps.findRetakeRequests(thread.id),
    submissionId: params.submissionId,
  })
  if (blocker) return err(blocker)

  const requestId = deps.generateId()
  await deps.saveRetakeRequest({
    id: requestId,
    threadId: thread.id,
    submissionId: params.submissionId,
    reason: reason.data,
    message: message.data,
    requestedAt: params.now,
  })
  await deps.notifyRetakeRequested({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ requestId })
}
