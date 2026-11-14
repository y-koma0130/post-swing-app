import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { DrillInput } from '../../domain/values/Drill'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  saveDrill: (drill: DrillInput & { id: string; coachUserId: string }) => Promise<void>
  generateId: () => string
}>

export type CreateDrill = (
  params: Readonly<{ actor: Actor; drill: DrillInput }>,
  dependencies: Dependencies
) => Promise<Result<{ drillId: string }, 'not_found'>>

/** コーチがドリルを登録する */
export const createDrill: CreateDrill = async ({ actor, drill }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  const id = deps.generateId()
  await deps.saveDrill({ ...drill, id, coachUserId: actor.userId })
  return ok({ drillId: id })
}
