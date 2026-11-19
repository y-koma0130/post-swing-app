import 'server-only'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, purchase, thread, user } from '@/server/db/schema'
import { findCoachAvailabilityFactsForCoaches } from '@/server/features/coach/public'
import type { ThreadSummaryDto } from '../../application/dto/ThreadSummary.dto'
import { THREAD_RULES } from '../../domain/rules'
import { calcApprovalDeadline } from '../../domain/services/calcApprovalDeadline.service'
import { calcEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import { isUnread } from '../../domain/services/isUnread.service'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'
import { countSubmissionsByThread } from '../repositories/threadRepository'
import { findLatestActivityByThread, findReadTimes } from './threadActivity'

type SummaryRow = Omit<
  ThreadSummaryDto,
  'submissionCount' | 'maxSubmissions' | 'unread' | 'approvalDeadline' | 'free'
> & {
  priceYen: number
  startedAt: Date
  coachUserId: string
  requestedAt: Date | null
}

/** 期限を、コーチの不在の分だけ延びた実際の期限にする */
const withEffectiveExpiries = async (rows: SummaryRow[]): Promise<Date[]> => {
  const facts = await findCoachAvailabilityFactsForCoaches(rows.map((r) => r.coachUserId))
  return rows.map(
    (row) => calcEffectiveExpiry(row, facts.get(row.coachUserId)?.absences ?? []).expiresAt
  )
}

const toSummary = (
  { startedAt: _startedAt, coachUserId: _coachUserId, requestedAt, priceYen, ...row }: SummaryRow,
  expiresAt: Date,
  counts: Map<string, number>,
  unread: boolean
): ThreadSummaryDto => ({
  ...row,
  expiresAt,
  approvalDeadline:
    row.status === 'requested' && requestedAt ? calcApprovalDeadline(requestedAt) : null,
  free: priceYen === 0,
  unread,
  submissionCount: counts.get(row.id) ?? 0,
  maxSubmissions: THREAD_RULES.maxSubmissionsByPlan[row.planKind],
})

/** 一覧のスレッドごとに、見ている人に未読があるか（相手側の出来事と、最後に開いた時刻で決める） */
const findUnread = async (
  threadIds: string[],
  viewer: { userId: string; side: 'coach' | 'student' }
): Promise<Map<string, boolean>> => {
  const [latest, reads] = await Promise.all([
    findLatestActivityByThread(threadIds, viewer.side === 'coach' ? 'student' : 'coach'),
    findReadTimes(threadIds, viewer.userId),
  ])
  return new Map(
    threadIds.map((id) => [
      id,
      isUnread({
        latestCounterpartActivityAt: latest.get(id) ?? null,
        lastReadAt: reads.get(id) ?? null,
      }),
    ])
  )
}

const STATUS_PRIORITY = {
  requested: 0,
  waiting_coach: 1,
  waiting_student: 2,
  closed: 3,
  declined: 4,
  draft: 5,
} as const satisfies Record<ThreadStatus, number>

/** コーチの一覧：承認待ちの申し込み → 添削待ち → 未読 → 期限が近い順。終わったものは最後 */
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
      requestedAt: thread.requestedAt,
      coachUserId: thread.coachUserId,
      coachSlug: coachProfile.slug,
      priceYen: purchase.priceYen,
    })
    .from(thread)
    .innerJoin(purchase, eq(purchase.id, thread.purchaseId))
    .innerJoin(user, eq(user.id, thread.studentUserId))
    .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
    // 申し込みの下書き（カードを登録する前）は、コーチにはまだ見せない
    .where(and(eq(thread.coachUserId, coachUserId), ne(thread.status, 'draft')))
    .all()
  const ids = rows.map((r) => r.id)
  const [counts, effective, unread] = await Promise.all([
    countSubmissionsByThread(ids),
    withEffectiveExpiries(rows),
    findUnread(ids, { userId: coachUserId, side: 'coach' }),
  ])
  return rows
    .map((row, i) =>
      toSummary(row, effective[i] ?? row.expiresAt, counts, unread.get(row.id) ?? false)
    )
    .toSorted(
      (a, b) =>
        STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
        Number(b.unread) - Number(a.unread) ||
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
      requestedAt: thread.requestedAt,
      coachUserId: thread.coachUserId,
      coachSlug: coachProfile.slug,
      priceYen: purchase.priceYen,
    })
    .from(thread)
    .innerJoin(purchase, eq(purchase.id, thread.purchaseId))
    .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
    .where(eq(thread.studentUserId, studentUserId))
    .orderBy(desc(thread.startedAt))
    .all()
  const ids = rows.map((r) => r.id)
  const [counts, effective, unread] = await Promise.all([
    countSubmissionsByThread(ids),
    withEffectiveExpiries(rows),
    findUnread(ids, { userId: studentUserId, side: 'student' }),
  ])
  return rows.map((row, i) =>
    toSummary(row, effective[i] ?? row.expiresAt, counts, unread.get(row.id) ?? false)
  )
}
