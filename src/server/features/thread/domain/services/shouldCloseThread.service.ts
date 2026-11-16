import type { Thread } from '../values/Thread'

export type ShouldCloseThread = (
  thread: Pick<Thread, 'status' | 'expiresAt' | 'submissions'>,
  now: Date
) => boolean

/**
 * 期限切れのスレッドを終了してよいか
 *
 * ドメインルール:
 * - 期限を過ぎ、届いた提出すべてにコーチが添削を返していたら終了する
 * - 期限ぎりぎりに届いた提出は、コーチが返すまで終了しない（生徒が払った分を返す）
 */
export const shouldCloseThread: ShouldCloseThread = (thread, now) =>
  thread.status !== 'closed' &&
  thread.expiresAt.getTime() <= now.getTime() &&
  thread.submissions.every((submission) => submission.replied)
