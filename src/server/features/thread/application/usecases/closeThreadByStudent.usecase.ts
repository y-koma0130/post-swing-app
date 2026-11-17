import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkStudentClose,
  type StudentCloseBlocker,
} from '../../domain/services/checkStudentClose.service'
import type { Thread } from '../../domain/values/Thread'

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  closeThreads: (threadIds: string[], closedAt: Date) => Promise<void>
  /** 生徒に「スレッドが終わりました。レビューをお願いします」と知らせる（キューに積むだけ） */
  notifyThreadClosed: (input: { threadId: string; studentUserId: string }) => Promise<void>
}>

export type CloseThreadByStudent = (
  params: Readonly<{ actor: Actor; threadId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, 'not_found' | StudentCloseBlocker>>

/**
 * 生徒が自分でスレッドを終える（本人の生徒だけ。終えられるかは checkStudentClose）
 */
export const closeThreadByStudent: CloseThreadByStudent = async (
  { actor, threadId, now },
  deps
) => {
  const thread = await deps.findThread(threadId)
  if (!thread || thread.studentUserId !== actor.userId) {
    return err('not_found')
  }
  const blocker = checkStudentClose(thread)
  if (blocker) {
    return err(blocker)
  }
  await deps.closeThreads([thread.id], now)
  await deps.notifyThreadClosed({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ threadId: thread.id })
}
