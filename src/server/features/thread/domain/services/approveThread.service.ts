import type { Thread } from '../values/Thread'
import type { ThreadStatus } from '../values/ThreadStatus'
import { calcThreadPeriod } from './calcThreadPeriod.service'

export type ApprovedThread = Readonly<{ status: ThreadStatus; startedAt: Date; expiresAt: Date }>

export type ApproveThread = (
  thread: Pick<Thread, 'submissions'>,
  approvedAt: Date
) => ApprovedThread

/**
 * コーチが申し込みを受けたあとのスレッド
 *
 * ドメインルール:
 * - 承認した時点から期間（30日）が始まる
 * - 申し込みで届いた動画を添削するところから始まる（コーチの番）
 */
export const approveThread: ApproveThread = (thread, approvedAt) => ({
  status: thread.submissions.some((s) => !s.replied) ? 'waiting_coach' : 'waiting_student',
  ...calcThreadPeriod(approvedAt),
})
