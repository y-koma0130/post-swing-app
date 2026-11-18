import type { Thread } from '../values/Thread'
import { isInLesson } from '../values/ThreadStatus'

export type StudentCloseBlocker = 'not_in_lesson' | 'awaiting_reply'

export type CheckStudentClose = (
  thread: Pick<Thread, 'status' | 'submissions'>
) => StudentCloseBlocker | null

/**
 * 生徒が自分でスレッドを終えられるか。できないときは理由を返す
 *
 * ドメインルール:
 * - レッスン中のスレッドだけ（申し込み中・終わったものは終えられない）
 * - 添削を待っている提出があるあいだは終えられない（コーチが返す前に閉じないように）
 * - 期限より前でも終えられる（返金はしない）。終えると受付枠が空き、レビューを書ける
 */
export const checkStudentClose: CheckStudentClose = (thread) => {
  if (!isInLesson(thread.status)) return 'not_in_lesson'
  if (thread.submissions.some((s) => !s.replied)) return 'awaiting_reply'
  return null
}
