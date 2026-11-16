import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, thread, user } from '@/server/db/schema'
import { findCoachAvailabilityFactsForCoaches } from '@/server/features/coach/public'
import type { ThreadSummaryDto } from '../../application/dto/ThreadSummary.dto'
import { calcEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import { countVideosByThread } from '../repositories/threadRepository'

type SummaryRow = Omit<ThreadSummaryDto, 'videoCount'> & { startedAt: Date; coachUserId: string }

/** 期限を、コーチの不在の分だけ延びた実際の期限にする */
const withEffectiveExpiries = async (rows: SummaryRow[]): Promise<Date[]> => {
  const facts = await findCoachAvailabilityFactsForCoaches(rows.map((r) => r.coachUserId))
  return rows.map(
    (row) => calcEffectiveExpiry(row, facts.get(row.coachUserId)?.absences ?? []).expiresAt
  )
}

const toSummary = (
  { startedAt: _startedAt, coachUserId: _coachUserId, ...row }: SummaryRow,
  expiresAt: Date,
  counts: Map<string, number>
): ThreadSummaryDto => ({ ...row, expiresAt, videoCount: counts.get(row.id) ?? 0 })

const STATUS_PRIORITY = { waiting_coach: 0, waiting_student: 1, closed: 2 } as const

/** コーチの一覧：コーチの番 → 期限が近い順。終わったものは最後 */
export type ListCoachThreadSummaries = (coachUserId: string) => Promise<ThreadSummaryDto[]>
export const listCoachThreadSummaries: ListCoachThreadSummaries = async (coachUserId) => {
  const rows = await getDb()
    .select({
      id: thread.id,
      counterpartName: user.name,
      planKind: thread.planKind,
      theme: thread.theme,
      status: thread.status,
      expiresAt: thread.expiresAt,
      startedAt: thread.startedAt,
      coachUserId: thread.coachUserId,
    })
    .from(thread)
    .innerJoin(user, eq(user.id, thread.studentUserId))
    .where(eq(thread.coachUserId, coachUserId))
    .all()
  const counts = await countVideosByThread(rows.map((r) => r.id))
  const effective = await withEffectiveExpiries(rows)
  return rows
    .map((row, i) => toSummary(row, effective[i] ?? row.expiresAt, counts))
    .toSorted(
      (a, b) =>
        STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
        a.expiresAt.getTime() - b.expiresAt.getTime()
    )
}

/** 生徒の一覧：新しい順 */
export type ListStudentThreadSummaries = (studentUserId: string) => Promise<ThreadSummaryDto[]>
export const listStudentThreadSummaries: ListStudentThreadSummaries = async (studentUserId) => {
  const rows = await getDb()
    .select({
      id: thread.id,
      counterpartName: coachProfile.displayName,
      planKind: thread.planKind,
      theme: thread.theme,
      status: thread.status,
      expiresAt: thread.expiresAt,
      startedAt: thread.startedAt,
      coachUserId: thread.coachUserId,
    })
    .from(thread)
    .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
    .where(eq(thread.studentUserId, studentUserId))
    .orderBy(desc(thread.startedAt))
    .all()
  const counts = await countVideosByThread(rows.map((r) => r.id))
  const effective = await withEffectiveExpiries(rows)
  return rows.map((row, i) => toSummary(row, effective[i] ?? row.expiresAt, counts))
}
