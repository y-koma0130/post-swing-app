import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import { addDays, type LocalDate, toLocalDate } from '@/server/utils/localDate'
import { ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  /** その日に終わった不在（coach が持つ） */
  findAbsencesEndingOn: (endDate: LocalDate) => Promise<CoachAbsence[]>
  /** 不在中に届いて未添削の提出と、生徒からの質問の数 */
  countAbsenceBacklog: (
    absenceId: string
  ) => Promise<{ submissionCount: number; chatCount: number }>
  notifyAbsenceEnded: (input: {
    coachUserId: string
    submissionCount: number
    chatCount: number
  }) => Promise<void>
}>

export type NotifyAbsenceEnded = (
  params: Readonly<{ now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ notified: number }, never>>

/**
 * 不在が明けた朝（日本時間9時の Cron）に、不在中に届いた提出と質問の件数をコーチに知らせる
 *
 * ドメインルール:
 * - 対象は前日（日本時間）に終わった不在。返信を再開する日の朝に届く
 * - 届いたものがなければ知らせない
 */
export const notifyAbsenceEnded: NotifyAbsenceEnded = async ({ now }, deps) => {
  const absences = await deps.findAbsencesEndingOn(addDays(toLocalDate(now), -1))
  let notified = 0
  for (const absence of absences) {
    const backlog = await deps.countAbsenceBacklog(absence.id)
    if (backlog.submissionCount === 0 && backlog.chatCount === 0) continue
    await deps.notifyAbsenceEnded({ coachUserId: absence.coachUserId, ...backlog })
    notified += 1
  }
  return ok({ notified })
}
