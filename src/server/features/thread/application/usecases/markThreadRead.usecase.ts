import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { ThreadMembers } from '../dto/ThreadDetail.dto'

type Dependencies = Readonly<{
  findThreadMembers: (threadId: string) => Promise<ThreadMembers | null>
  saveThreadRead: (input: { threadId: string; userId: string; at: Date }) => Promise<void>
}>

export type MarkThreadRead = (
  params: Readonly<{ actor: Actor; threadId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<null, 'not_found'>>

/** スレッドを開いたことを記録する（未読の表示と通知のまとめに使う）。担当のコーチと本人の生徒だけ */
export const markThreadRead: MarkThreadRead = async ({ actor, threadId, now }, deps) => {
  const members = await deps.findThreadMembers(threadId)
  if (
    !members ||
    (members.coachUserId !== actor.userId && members.studentUserId !== actor.userId)
  ) {
    return err('not_found')
  }
  await deps.saveThreadRead({ threadId, userId: actor.userId, at: now })
  return ok(null)
}
