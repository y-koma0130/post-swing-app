import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

export type JoinWaitlistParams = Readonly<{ actor: Actor; coachSlug: string }>

type Dependencies = Readonly<{
  findCoachUserIdBySlug: (slug: string) => Promise<string | null>
  /** すでに登録済みなら何もしない */
  saveWaitlistEntry: (coachUserId: string, studentUserId: string) => Promise<void>
}>

export type JoinWaitlist = (
  params: JoinWaitlistParams,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | 'own_coach'>>

/** 満枠のコーチのキャンセル待ちに登録する。空きが出たら LINE で知らせる */
export const joinWaitlist: JoinWaitlist = async ({ actor, coachSlug }, deps) => {
  const coachUserId = await deps.findCoachUserIdBySlug(coachSlug)
  if (coachUserId === null) {
    return err('not_found')
  }
  if (coachUserId === actor.userId) {
    return err('own_coach')
  }
  await deps.saveWaitlistEntry(coachUserId, actor.userId)
  return ok(undefined)
}
