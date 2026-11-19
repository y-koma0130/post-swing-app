import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { DrillInput } from '../../domain/values/Drill'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  /** そのコーチが上げた動画で、まだどのドリルにも使っていないか */
  isUnusedOwnDrillVideo: (coachUserId: string, videoId: string) => Promise<boolean>
  saveDrill: (drill: DrillInput & { id: string; coachUserId: string }) => Promise<void>
  generateId: () => string
}>

export type CreateDrill = (
  params: Readonly<{ actor: Actor; drill: DrillInput }>,
  dependencies: Dependencies
) => Promise<Result<{ drillId: string }, 'not_found' | 'invalid_video'>>

/** コーチがドリルを登録する（お手本の動画は、先に上げた自分の動画だけ） */
export const createDrill: CreateDrill = async ({ actor, drill }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  if (!(await deps.isUnusedOwnDrillVideo(actor.userId, drill.videoId))) {
    return err('invalid_video')
  }
  const id = deps.generateId()
  await deps.saveDrill({ ...drill, id, coachUserId: actor.userId })
  return ok({ drillId: id })
}
