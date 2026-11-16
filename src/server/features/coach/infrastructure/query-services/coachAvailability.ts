import 'server-only'
import type {
  CoachAvailabilityDto,
  UpcomingAbsenceDto,
} from '../../application/dto/CoachAvailability.dto'
import { calcCoachAvailability } from '../../domain/services/calcCoachAvailability.service'
import { findUpcomingAbsence } from '../../domain/services/findUpcomingAbsence.service'
import type { CoachAbsence } from '../../domain/values/CoachAbsence'
import type { CoachAvailability } from '../../domain/values/CoachAvailability'
import {
  findAbsences,
  findAbsencesForCoaches,
  findDelayFlagSetAt,
  findDelayFlagsForCoaches,
} from '../repositories/absenceRepository'

export type CoachAvailabilityFacts = Readonly<{
  absences: CoachAbsence[]
  delayFlagSetAt: Date | null
}>

/** コーチの状態を決めるのに要る事実（不在期間と返信遅れフラグ） */
export const findCoachAvailabilityFacts = async (
  coachUserId: string
): Promise<CoachAvailabilityFacts> => {
  const [absences, delayFlagSetAt] = await Promise.all([
    findAbsences(coachUserId),
    findDelayFlagSetAt(coachUserId),
  ])
  return { absences, delayFlagSetAt }
}

/** 複数のコーチの事実（一覧・毎日の処理用） */
export const findCoachAvailabilityFactsForCoaches = async (
  coachUserIds: string[]
): Promise<Map<string, CoachAvailabilityFacts>> => {
  const [absences, flags] = await Promise.all([
    findAbsencesForCoaches(coachUserIds),
    findDelayFlagsForCoaches(coachUserIds),
  ])
  return new Map(
    coachUserIds.map((id) => [
      id,
      { absences: absences.get(id) ?? [], delayFlagSetAt: flags.get(id) ?? null },
    ])
  )
}

/** コーチの今の状態 */
export const findCoachAvailability = async (
  coachUserId: string,
  now: Date
): Promise<CoachAvailability> =>
  calcCoachAvailability({ ...(await findCoachAvailabilityFacts(coachUserId)), now })

/** 画面に返す形にする */
export const toAvailabilityDto = (availability: CoachAvailability): CoachAvailabilityDto => {
  switch (availability.kind) {
    case 'absent':
      return {
        kind: 'absent',
        absenceId: availability.absence.id,
        startDate: availability.absence.startDate,
        endDate: availability.absence.endDate,
        resumeDate: availability.resumeDate,
        note: availability.absence.note,
      }
    case 'delayed':
      return { kind: 'delayed' }
    case 'available':
      return { kind: 'available', replyTargetHours: availability.replyTargetHours }
  }
}

/** これから始まる不在（7日以内）を画面に返す形で */
export const toUpcomingAbsenceDto = (
  facts: CoachAvailabilityFacts,
  now: Date
): UpcomingAbsenceDto | null => {
  const upcoming = findUpcomingAbsence({ absences: facts.absences, now })
  return upcoming
    ? { startDate: upcoming.startDate, endDate: upcoming.endDate, note: upcoming.note }
    : null
}
