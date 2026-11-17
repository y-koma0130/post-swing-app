import type { Thread } from '../values/Thread'
import { isFinished, type ThreadStatus } from '../values/ThreadStatus'

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
 * - 生徒が提出したら、コーチの番
 * - コーチが添削を返したら生徒の番。ただし添削していない提出が残っていればコーチの番のまま
 * - チャットでは変わらない（「コーチの番」は添削を待つ提出があるときだけ。未読は既読で別に見る）
 * - 終了したスレッドは変わらない
 * - 申し込みの下書き・承認待ちのあいだは変わらない（承認待ちに進むのはカードの仮押さえ、
 *   レッスン中に進むのはコーチの承認）
 */
export const nextStatusAfter: NextStatusAfter = (thread, event) => {
  if (isFinished(thread.status)) return thread.status
  if (thread.status === 'draft' || thread.status === 'requested') return thread.status
  if (event === 'student_chatted' || event === 'coach_chatted') return thread.status
  if (event === 'student_submitted') return 'waiting_coach'
  const unreplied = thread.submissions.filter((s) => !s.replied).length
  // 返した提出は、この時点ではまだ replied になっていない
  const remaining = event === 'coach_replied' ? unreplied - 1 : unreplied
  return remaining > 0 ? 'waiting_coach' : 'waiting_student'
}
