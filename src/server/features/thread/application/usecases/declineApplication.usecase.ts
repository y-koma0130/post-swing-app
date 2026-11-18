import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  type ApplicationDecisionBlocker,
  checkApplicationDecision,
} from '../../domain/services/checkApplicationDecision.service'
import {
  type CoachDeclineReason,
  type DeclineReason,
  declineMessageSchema,
} from '../../domain/values/DeclineReason'
import type { Thread } from '../../domain/values/Thread'

export type ThreadDecline = Readonly<{
  reason: DeclineReason
  message: string
  decidedAt: Date
}>

export type DeclineApplicationParams = Readonly<{
  actor: Actor
  threadId: string
  reason: CoachDeclineReason
  /** ひとこと（任意） */
  message: string
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findThreadPayment: (threadId: string) => Promise<{ purchaseId: string } | null>
  /** カードの仮押さえを外す（purchase が持つ） */
  voidPayment: (purchaseId: string) => Promise<Result<unknown, string>>
  saveDecline: (threadId: string, decline: ThreadDecline) => Promise<void>
  /** 生徒に「お受けできませんでした」と知らせる（キューに積むだけ） */
  notifyDeclined: (input: { threadId: string; studentUserId: string }) => Promise<void>
}>

export type DeclineApplicationError =
  | 'not_found'
  | ApplicationDecisionBlocker
  | 'message_too_long'
  | 'void_failed'

export type DeclineApplication = (
  params: DeclineApplicationParams,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, DeclineApplicationError>>

/**
 * コーチが申し込みを断る。カードの仮押さえを外してから、断った記録を残す（生徒には請求しない）
 *
 * - 担当のコーチだけ（他人には not_found）
 * - 理由を選び、ひとこと（200文字まで、任意）を添えられる
 */
export const declineApplication: DeclineApplication = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.coachUserId !== params.actor.userId) {
    return err('not_found')
  }
  const blocker = checkApplicationDecision(thread, 'decline', params.now)
  if (blocker) {
    return err(blocker)
  }
  const message = declineMessageSchema.safeParse(params.message)
  if (!message.success) {
    return err('message_too_long')
  }
  const payment = await deps.findThreadPayment(thread.id)
  if (!payment) {
    return err('not_found')
  }
  const voided = await deps.voidPayment(payment.purchaseId)
  if (!voided.ok) {
    return err('void_failed')
  }
  await deps.saveDecline(thread.id, {
    reason: params.reason,
    message: message.data,
    decidedAt: params.now,
  })
  await deps.notifyDeclined({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ threadId: thread.id })
}
