import { THREAD_RULES } from '../rules'
import type { Thread } from '../values/Thread'

export type VideoSubmissionBlocker = 'closed' | 'expired' | 'awaiting_reply' | 'video_limit'

export type CheckVideoSubmission = (
  thread: Pick<Thread, 'status' | 'expiresAt' | 'planKind' | 'videos'>,
  now: Date
) => VideoSubmissionBlocker | null

/**
 * 生徒がいま動画を送れるか。送れないときは理由を返す
 *
 * ドメインルール:
 * - 終了・期限切れのスレッドには送れない
 * - 前の動画にコーチが返信してから、次の動画を送る（送る→直す→撮り直す）
 * - 本数はプランごとの上限まで
 */
export const checkVideoSubmission: CheckVideoSubmission = (thread, now) => {
  if (thread.status === 'closed') return 'closed'
  if (thread.expiresAt.getTime() <= now.getTime()) return 'expired'
  if (thread.videos.some((video) => !video.replied)) return 'awaiting_reply'
  if (thread.videos.length >= THREAD_RULES.maxVideosByPlan[thread.planKind]) return 'video_limit'
  return null
}
