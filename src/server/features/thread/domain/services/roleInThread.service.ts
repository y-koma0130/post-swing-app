import type { ChatSender } from '../values/ChatMessage'
import type { Thread } from '../values/Thread'

export type RoleInThread = (
  thread: Pick<Thread, 'coachUserId' | 'studentUserId'>,
  userId: string
) => ChatSender | null

/** スレッドでの立場。担当のコーチか本人の生徒でなければ null（見せない・送らせない） */
export const roleInThread: RoleInThread = (thread, userId) =>
  thread.coachUserId === userId ? 'coach' : thread.studentUserId === userId ? 'student' : null
