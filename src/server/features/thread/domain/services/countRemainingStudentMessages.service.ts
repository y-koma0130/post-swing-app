import { THREAD_RULES } from '../rules'
import type { Thread } from '../values/Thread'

export type CountRemainingStudentMessages = (
  thread: Pick<Thread, 'messages'>,
  videoId: string
) => number

/**
 * 動画1本あたり、生徒があと何通送れるか
 *
 * ドメインルール:
 * - 生徒は動画1本ごとに3通まで。コーチは無制限
 */
export const countRemainingStudentMessages: CountRemainingStudentMessages = (thread, videoId) => {
  const sent = thread.messages.filter((m) => m.videoId === videoId && m.from === 'student').length
  return Math.max(THREAD_RULES.maxStudentMessagesPerVideo - sent, 0)
}
