import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { type ApprovedThread, approveThread } from '../../domain/services/approveThread.service'
import {
  type ApplicationDecisionBlocker,
  checkApplicationDecision,
} from '../../domain/services/checkApplicationDecision.service'
import type { Thread } from '../../domain/values/Thread'

export type ApproveApplicationParams = Readonly<{
  actor: Actor
  threadId: string
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findThreadPayment: (threadId: string) => Promise<{ purchaseId: string } | null>
  /** 仮押さえした支払いを確定する（purchase が持つ）。カードの問題で確定できなければ失敗 */
  capturePayment: (purchaseId: string) => Promise<Result<unknown, string>>
  saveApproval: (threadId: string, approved: ApprovedThread & { decidedAt: Date }) => Promise<void>
  /** 生徒に「受け付けられました」と知らせる（キューに積むだけ） */
  notifyApproved: (input: { threadId: string; studentUserId: string }) => Promise<void>
}>

export type ApproveApplicationError = 'not_found' | ApplicationDecisionBlocker | 'capture_failed'

export type ApproveApplication = (
  params: ApproveApplicationParams,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, ApproveApplicationError>>

/**
 * コーチが申し込みを受ける。仮押さえした支払いを確定してから、レッスンを始める
 *
 * - 担当のコーチだけ（他人には not_found）
 * - 受けられるかは checkApplicationDecision、始めたあとの状態と期間は approveThread で決める
 * - 支払いを確定できなければ、承認待ちのままにする
 */
export const approveApplication: ApproveApplication = async ({ actor, threadId, now }, deps) => {
  const thread = await deps.findThread(threadId)
  if (!thread || thread.coachUserId !== actor.userId) {
    return err('not_found')
  }
  const blocker = checkApplicationDecision(thread, 'approve', now)
  if (blocker) {
    return err(blocker)
  }
  const payment = await deps.findThreadPayment(thread.id)
  if (!payment) {
    return err('not_found')
  }
  const captured = await deps.capturePayment(payment.purchaseId)
  if (!captured.ok) {
    return err('capture_failed')
  }
  await deps.saveApproval(thread.id, { ...approveThread(thread, now), decidedAt: now })
  await deps.notifyApproved({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ threadId: thread.id })
}
