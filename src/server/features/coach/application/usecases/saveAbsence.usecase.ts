import type { Actor } from '@/server/utils/actor'
import { toLocalDate } from '@/server/utils/localDate'
import { err, ok, type Result } from '@/server/utils/result'
import { type AbsenceBlocker, checkAbsence } from '../../domain/services/checkAbsence.service'
import type { AbsenceInput, CoachAbsence } from '../../domain/values/CoachAbsence'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  findAbsences: (coachUserId: string) => Promise<CoachAbsence[]>
  saveAbsence: (absence: CoachAbsence, now: Date) => Promise<void>
  generateId: () => string
}>

export type SaveAbsence = (
  params: Readonly<{
    actor: Actor
    /** 編集するときの id。追加なら null */
    absenceId: string | null
    input: AbsenceInput
    now: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<{ absenceId: string }, 'not_found' | AbsenceBlocker>>

/** コーチが不在期間を追加・編集する（保存できるかは checkAbsence で決める） */
export const saveAbsence: SaveAbsence = async ({ actor, absenceId, input, now }, deps) => {
  if (!(await deps.isCoach(actor.userId))) {
    return err('not_found')
  }
  const absences = await deps.findAbsences(actor.userId)
  if (absenceId !== null && !absences.some((a) => a.id === absenceId)) {
    return err('not_found')
  }
  const blocker = checkAbsence({
    absence: input,
    others: absences.filter((a) => a.id !== absenceId),
    today: toLocalDate(now),
  })
  if (blocker) {
    return err(blocker)
  }
  const id = absenceId ?? deps.generateId()
  await deps.saveAbsence({ ...input, id, coachUserId: actor.userId }, now)
  return ok({ absenceId: id })
}
