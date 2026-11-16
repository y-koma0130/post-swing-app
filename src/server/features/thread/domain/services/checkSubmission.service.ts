import { THREAD_RULES } from '../rules'
import type { Thread } from '../values/Thread'

export type SubmissionBlocker = 'closed' | 'expired' | 'awaiting_reply' | 'submission_limit'

export type CheckSubmission = (
  thread: Pick<Thread, 'status' | 'expiresAt' | 'planKind' | 'submissions'>,
  now: Date
) => SubmissionBlocker | null

/**
 * 生徒がいま提出できるか（動画を上げる前と、提出を確定するときの両方で使う）。できないときは理由を返す
 *
 * ドメインルール:
 * - 終了・期限切れのスレッドには提出できない
 * - 前の提出にコーチが添削を返してから、次を提出する（送る→直す→撮り直す）
 * - 回数はプランごとの上限まで（お試し1回、それ以外3回）
 */
export const checkSubmission: CheckSubmission = (thread, now) => {
  if (thread.status === 'closed') return 'closed'
  if (thread.expiresAt.getTime() <= now.getTime()) return 'expired'
  if (thread.submissions.some((s) => !s.replied)) return 'awaiting_reply'
  if (thread.submissions.length >= THREAD_RULES.maxSubmissionsByPlan[thread.planKind]) {
    return 'submission_limit'
  }
  return null
}
