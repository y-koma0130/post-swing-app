import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachAbsence, coachProfile } from '@/server/db/schema'
import { type CoachAbsence, coachAbsenceSchema } from '../../domain/values/CoachAbsence'

const toAbsence = (row: typeof coachAbsence.$inferSelect): CoachAbsence =>
  coachAbsenceSchema.parse({
    id: row.id,
    coachUserId: row.coachUserId,
    startDate: row.startDate,
    endDate: row.endDate,
    note: row.note,
    pauseNewSignups: row.pauseNewSignups,
  })

export type FindAbsences = (coachUserId: string) => Promise<CoachAbsence[]>
/**
 * コーチの不在期間（終わったものも含む。スレッドの期限の延長で、過去の不在も数えるため）
 */
export const findAbsences: FindAbsences = async (coachUserId) => {
  const rows = await getDb()
    .select()
    .from(coachAbsence)
    .where(eq(coachAbsence.coachUserId, coachUserId))
    .orderBy(asc(coachAbsence.startDate))
    .all()
  return rows.map(toAbsence)
}

export type FindAbsencesForCoaches = (
  coachUserIds: string[]
) => Promise<Map<string, CoachAbsence[]>>
/** 複数のコーチの不在期間（一覧・毎日の処理用） */
export const findAbsencesForCoaches: FindAbsencesForCoaches = async (coachUserIds) => {
  const map = new Map<string, CoachAbsence[]>()
  if (coachUserIds.length === 0) return map
  const rows = await getDb()
    .select()
    .from(coachAbsence)
    .where(inArray(coachAbsence.coachUserId, [...new Set(coachUserIds)]))
    .orderBy(asc(coachAbsence.startDate))
    .all()
  for (const row of rows) {
    map.set(row.coachUserId, [...(map.get(row.coachUserId) ?? []), toAbsence(row)])
  }
  return map
}

export type FindAbsencesEndingOn = (endDate: string) => Promise<CoachAbsence[]>
/** その日に終わった不在（不在明けの通知用） */
export const findAbsencesEndingOn: FindAbsencesEndingOn = async (endDate) => {
  const rows = await getDb()
    .select()
    .from(coachAbsence)
    .where(eq(coachAbsence.endDate, endDate))
    .all()
  return rows.map(toAbsence)
}

export type SaveAbsence = (absence: CoachAbsence, now: Date) => Promise<void>
/** 追加・更新（同じ id なら更新） */
export const saveAbsence: SaveAbsence = async (absence, now) => {
  const values = {
    startDate: absence.startDate,
    endDate: absence.endDate,
    note: absence.note,
    pauseNewSignups: absence.pauseNewSignups,
    updatedAt: now,
  }
  await getDb()
    .insert(coachAbsence)
    .values({ id: absence.id, coachUserId: absence.coachUserId, ...values, createdAt: now })
    .onConflictDoUpdate({ target: coachAbsence.id, set: values })
}

export type DeleteAbsence = (absenceId: string, coachUserId: string) => Promise<void>
export const deleteAbsence: DeleteAbsence = async (absenceId, coachUserId) => {
  await getDb()
    .delete(coachAbsence)
    .where(and(eq(coachAbsence.id, absenceId), eq(coachAbsence.coachUserId, coachUserId)))
}

export type FindDelayFlagSetAt = (coachUserId: string) => Promise<Date | null>
export const findDelayFlagSetAt: FindDelayFlagSetAt = async (coachUserId) => {
  const row = await getDb()
    .select({ setAt: coachProfile.delayFlagSetAt })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  return row?.setAt ?? null
}

export type SaveDelayFlag = (coachUserId: string, setAt: Date | null) => Promise<void>
/** 返信遅れフラグを立てる（日時）・下ろす（null） */
export const saveDelayFlag: SaveDelayFlag = async (coachUserId, setAt) => {
  await getDb()
    .update(coachProfile)
    .set({ delayFlagSetAt: setAt, updatedAt: new Date() })
    .where(eq(coachProfile.userId, coachUserId))
}

export type FindDelayFlagsForCoaches = (coachUserIds: string[]) => Promise<Map<string, Date | null>>
export const findDelayFlagsForCoaches: FindDelayFlagsForCoaches = async (coachUserIds) => {
  if (coachUserIds.length === 0) return new Map()
  const rows = await getDb()
    .select({ userId: coachProfile.userId, setAt: coachProfile.delayFlagSetAt })
    .from(coachProfile)
    .where(inArray(coachProfile.userId, [...new Set(coachUserIds)]))
    .all()
  return new Map(rows.map((r) => [r.userId, r.setAt]))
}
