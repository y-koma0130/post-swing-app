import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { Plan } from '../../domain/values/Plan'

export type UpdatePlansParams = Readonly<{
  actor: Actor
  plans: readonly Plan[]
}>

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  savePlans: (userId: string, plans: readonly Plan[]) => Promise<void>
}>

export type UpdatePlans = (
  params: UpdatePlansParams,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found' | 'duplicate_kind'>>

/** コーチが自分のプランの価格・説明・受付の有無を変える */
export const updatePlans: UpdatePlans = async ({ actor, plans }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  if (new Set(plans.map((p) => p.kind)).size !== plans.length) {
    return err('duplicate_kind')
  }
  await deps.savePlans(actor.userId, plans)
  return ok(undefined)
}
