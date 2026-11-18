import type { Thread } from '../values/Thread'
import { calcApprovalDeadline } from './calcApprovalDeadline.service'

export type ApplicationDecisionBlocker = 'not_requested' | 'approval_expired'

export type CheckApplicationDecision = (
  thread: Pick<Thread, 'status' | 'requestedAt'>,
  decision: 'approve' | 'decline',
  now: Date
) => ApplicationDecisionBlocker | null

/**
 * コーチがいま申し込みを受ける・断ることができるか。できないときは理由を返す
 *
 * ドメインルール:
 * - 承認待ちの申し込みだけ
 * - 受けられるのは期限（48時間）まで。過ぎたら断った扱いになる（カードの仮押さえを外すため）
 * - 断るのは、期限を過ぎても毎日の処理より先ならできる（結果は同じ）
 */
export const checkApplicationDecision: CheckApplicationDecision = (thread, decision, now) => {
  if (thread.status !== 'requested' || thread.requestedAt === null) return 'not_requested'
  if (
    decision === 'approve' &&
    calcApprovalDeadline(thread.requestedAt).getTime() <= now.getTime()
  ) {
    return 'approval_expired'
  }
  return null
}
