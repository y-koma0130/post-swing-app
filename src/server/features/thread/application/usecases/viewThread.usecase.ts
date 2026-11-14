import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { ThreadDetailDto, ThreadMembers } from '../dto/ThreadDetail.dto'

export type ViewThreadParams = Readonly<{
  actor: Actor
  threadId: string
  /** どちらの立場で見るか。コーチ本人が自分の生徒の画面を見ることはない */
  as: 'coach' | 'student'
}>

type Dependencies = Readonly<{
  findThreadDetail: (
    threadId: string
  ) => Promise<{ detail: ThreadDetailDto; members: ThreadMembers } | null>
}>

export type ViewThread = (
  params: ViewThreadParams,
  dependencies: Dependencies
) => Promise<Result<ThreadDetailDto, 'not_found'>>

/**
 * スレッドを見る
 *
 * 担当のコーチ・本人の生徒だけが見られる。他人には「存在しない」と返す（IDの有無を推測させない）
 */
export const viewThread: ViewThread = async ({ actor, threadId, as }, deps) => {
  const found = await deps.findThreadDetail(threadId)
  if (!found) {
    return err('not_found')
  }
  const memberId = as === 'coach' ? found.members.coachUserId : found.members.studentUserId
  if (memberId !== actor.userId) {
    return err('not_found')
  }
  return ok(found.detail)
}
