import type { Thread } from '../values/Thread'
import { isInLesson } from '../values/ThreadStatus'

export type ShouldCloseThread = (
  thread: Pick<Thread, 'status' | 'expiresAt' | 'submissions'>,
  now: Date
) => boolean

/**
 * 期限切れのスレッドを終了してよいか
 *
 * ドメインルール:
 * - レッスン中のスレッドだけ（下書き・承認待ちは、申し込みの期限で別に扱う）
 * - 期限を過ぎ、届いた提出すべてにコーチが添削を返していたら終了する
 * - 期限ぎりぎりに届いた提出は、コーチが返すまで終了しない（生徒が払った分を返す）
 */
export const shouldCloseThread: ShouldCloseThread = (thread, now) =>
  isInLesson(thread.status) &&
  thread.expiresAt.getTime() <= now.getTime() &&
  thread.submissions.every((submission) => submission.replied)
