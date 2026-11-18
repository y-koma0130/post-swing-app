import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  saveDelayFlag: (coachUserId: string, setAt: Date | null) => Promise<void>
}>

export type SetDelayFlag = (
  params: Readonly<{ actor: Actor; on: boolean; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found'>>

/**
 * コーチが返信遅れフラグを立てる・下ろす
 * （立てた日時を残し、7日で外れるかは calcCoachAvailability が判定する）
 */
export const setDelayFlag: SetDelayFlag = async ({ actor, on, now }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  await deps.saveDelayFlag(actor.userId, on ? now : null)
  return ok(undefined)
}
