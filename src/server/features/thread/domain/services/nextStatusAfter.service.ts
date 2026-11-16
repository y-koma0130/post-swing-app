import type { Thread } from '../values/Thread'
import type { ThreadStatus } from '../values/ThreadStatus'

export type ThreadEvent =
  | 'student_sent_video'
  | 'student_chatted'
  | 'coach_replied'
  | 'coach_chatted'

export type NextStatusAfter = (
  thread: Pick<Thread, 'status' | 'videos'>,
  event: ThreadEvent
) => ThreadStatus

/**
 * 出来事のあとのスレッドの状態
 *
 * ドメインルール:
 * - 生徒が動画やチャットを送ったら、コーチの番
 * - コーチが返信したら生徒の番。ただし返信していない動画が残っていればコーチの番のまま
 * - 終了したスレッドは変わらない
 */
export const nextStatusAfter: NextStatusAfter = (thread, event) => {
  if (thread.status === 'closed') return 'closed'
  if (event === 'student_sent_video' || event === 'student_chatted') return 'waiting_coach'
  const unreplied = thread.videos.filter((v) => !v.replied).length
  // 返信した動画は、この時点ではまだ replied になっていない
  const remaining = event === 'coach_replied' ? unreplied - 1 : unreplied
  return remaining > 0 ? 'waiting_coach' : 'waiting_student'
}
