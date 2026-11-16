import type { Thread } from '../values/Thread'
import type { ThreadStatus } from '../values/ThreadStatus'

export type ThreadEvent =
  | 'student_submitted'
  | 'student_chatted'
  | 'coach_replied'
  | 'coach_chatted'

export type NextStatusAfter = (
  thread: Pick<Thread, 'status' | 'submissions'>,
  event: ThreadEvent
) => ThreadStatus

/**
 * 出来事のあとのスレッドの状態
 *
 * ドメインルール:
 * - 生徒が提出やチャットを送ったら、コーチの番
 * - コーチが添削を返したら生徒の番。ただし添削していない提出が残っていればコーチの番のまま
 * - 終了したスレッドは変わらない
 */
export const nextStatusAfter: NextStatusAfter = (thread, event) => {
  if (thread.status === 'closed') return 'closed'
  if (event === 'student_submitted' || event === 'student_chatted') return 'waiting_coach'
  const unreplied = thread.submissions.filter((s) => !s.replied).length
  // 返した提出は、この時点ではまだ replied になっていない
  const remaining = event === 'coach_replied' ? unreplied - 1 : unreplied
  return remaining > 0 ? 'waiting_coach' : 'waiting_student'
}
