import type { Thread } from '../values/Thread'

export type ShouldCloseThread = (
  thread: Pick<Thread, 'status' | 'expiresAt' | 'videos'>,
  now: Date
) => boolean

/**
 * 期限切れのスレッドを終了してよいか
 *
 * ドメインルール:
 * - 期限を過ぎ、届いた動画すべてにコーチが返信していたら終了する
 * - 期限ぎりぎりに届いた動画は、コーチが返信するまで終了しない（生徒が払った分を返す）
 */
export const shouldCloseThread: ShouldCloseThread = (thread, now) =>
  thread.status !== 'closed' &&
  thread.expiresAt.getTime() <= now.getTime() &&
  thread.videos.every((video) => video.replied)
