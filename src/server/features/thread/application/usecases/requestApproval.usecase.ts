import { err, ok, type Result } from '@/server/utils/result'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type RequestApprovalParams = Readonly<{
  purchaseId: string
  now: Date
}>

type Dependencies = Readonly<{
  /** 申し込みのスレッド（下書き） */
  findThreadByPurchase: (purchaseId: string) => Promise<{
    id: string
    coachUserId: string
    status: ThreadStatus
    submissionCount: number
  } | null>
  markThreadRequested: (threadId: string, requestedAt: Date) => Promise<void>
  /** コーチに「申し込みがありました」と知らせる（キューに積むだけ） */
  notifyApplicationReceived: (input: { threadId: string; coachUserId: string }) => Promise<void>
}>

export type RequestApprovalError = 'not_found' | 'not_draft'

export type RequestApproval = (
  params: RequestApprovalParams,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, RequestApprovalError>>

/**
 * カードの仮押さえが済んだ申し込みを、コーチの承認待ちにする（purchase が Webhook から呼ぶ）
 *
 * ドメインルール:
 * - 悩みと動画を送った下書きだけが承認待ちになる
 * - 同じ通知が2回届いても、承認待ちのままにする（コーチへの通知も1回）
 * - それ以外（消えた・送っていない下書き）は失敗を返す。呼ぶ側がカードの仮押さえを外す
 */
export const requestApproval: RequestApproval = async ({ purchaseId, now }, deps) => {
  const thread = await deps.findThreadByPurchase(purchaseId)
  if (!thread) {
    return err('not_found')
  }
  if (thread.status === 'requested') {
    return ok({ threadId: thread.id })
  }
  if (thread.status !== 'draft' || thread.submissionCount === 0) {
    return err('not_draft')
  }
  await deps.markThreadRequested(thread.id, now)
  await deps.notifyApplicationReceived({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok({ threadId: thread.id })
}
