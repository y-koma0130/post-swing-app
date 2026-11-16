import { THREAD_RULES } from '../rules'
import type { Thread } from '../values/Thread'

export type CountRemainingStudentMessages = (
  thread: Pick<Thread, 'planKind' | 'messages'>
) => number

/**
 * 生徒がこのスレッドで、あと何通チャットを送れるか
 *
 * ドメインルール:
 * - 生徒はスレッド全体で30通まで（お試しは10通）。提出の回数とは別に数える
 * - コーチは無制限
 */
export const countRemainingStudentMessages: CountRemainingStudentMessages = (thread) => {
  const sent = thread.messages.filter((m) => m.from === 'student').length
  return Math.max(THREAD_RULES.maxStudentMessagesByPlan[thread.planKind] - sent, 0)
}
