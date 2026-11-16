import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { CoachAbsence } from '../../domain/values/CoachAbsence'

type Dependencies = Readonly<{
  findAbsences: (coachUserId: string) => Promise<CoachAbsence[]>
  deleteAbsence: (absenceId: string, coachUserId: string) => Promise<void>
}>

export type DeleteAbsence = (
  params: Readonly<{ actor: Actor; absenceId: string }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found'>>

/** コーチが自分の不在期間を消す */
export const deleteAbsence: DeleteAbsence = async ({ actor, absenceId }, deps) => {
  const absences = await deps.findAbsences(actor.userId)
  if (!absences.some((a) => a.id === absenceId)) {
    return err('not_found')
  }
  await deps.deleteAbsence(absenceId, actor.userId)
  return ok(undefined)
}
