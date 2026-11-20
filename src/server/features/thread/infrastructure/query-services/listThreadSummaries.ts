import 'server-only'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, purchase, thread, user } from '@/server/db/schema'
import { findCoachAvailabilityFactsForCoaches } from '@/server/features/coach/public'
import type { ThreadSummaryDto } from '../../application/dto/ThreadSummary.dto'
import { THREAD_RULES } from '../../domain/rules'
import { calcApprovalDeadline } from '../../domain/services/calcApprovalDeadline.service'
import { calcEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import { calcReplyDueAt, replyClockStart } from '../../domain/services/calcReplyDueAt.service'
import { isUnread } from '../../domain/services/isUnread.service'
import { countSubmissionsByThread } from '../repositories/threadRepository'
import { findLatestActivityByThread, findReadTimes } from './threadActivity'
import {
  findPendingReplyFacts,
  findReviewedThreadIds,
  type PendingReplyFacts,
} from './threadListFacts'

type SummaryRow = Pick<
  ThreadSummaryDto,
  'id' | 'counterpartName' | 'coachSlug' | 'planKind' | 'theme' | 'status' | 'expiresAt'
> & {
  priceYen: number
  startedAt: Date
  coachUserId: string
  requestedAt: Date | null
  closedAt: Date | null
  decidedAt: Date | null
}

/** 一覧の行をまとめて作る（期限・返事の目安はコーチの不在の分だけずらす） */
const toSummaries = async (
  rows: SummaryRow[],
  viewer: { userId: string; side: 'coach' | 'student' }
): Promise<ThreadSummaryDto[]> => {
  const ids = rows.map((r) => r.id)
  const [counts, facts, unread, pending, reviewed] = await Promise.all([
    countSubmissionsByThread(ids),
    findCoachAvailabilityFactsForCoaches(rows.map((r) => r.coachUserId)),
    findUnread(ids, viewer),
    findPendingReplyFacts(ids),
    findReviewedThreadIds(ids),
  ])
  return rows.map((row) => {
    const absences = facts.get(row.coachUserId)?.absences ?? []
    const waiting = row.status === 'waiting_coach' ? pending.get(row.id) : undefined
    return {
      id: row.id,
      counterpartName: row.counterpartName,
      coachSlug: row.coachSlug,
      planKind: row.planKind,
      theme: row.theme,
      status: row.status,
      expiresAt: calcEffectiveExpiry(row, absences).expiresAt,
      approvalDeadline:
        row.status === 'requested' && row.requestedAt
          ? calcApprovalDeadline(row.requestedAt)
          : null,
      free: row.priceYen === 0,
      unread: unread.get(row.id) ?? false,
      submissionCount: counts.get(row.id) ?? 0,
      maxSubmissions: THREAD_RULES.maxSubmissionsByPlan[row.planKind],
      replyDueAt: waiting ? replyDueOf(waiting, row.startedAt, absences) : null,
      retakeOpen: waiting?.retakeOpen ?? false,
      finishedAt:
        row.status === 'closed' ? row.closedAt : row.status === 'declined' ? row.decidedAt : null,
      needsReview: row.status === 'closed' && !reviewed.has(row.id),
    }
  })
}

/** 添削の返事の目安。撮り直しを待っているあいだは止まっているので null */
const replyDueOf = (
  pending: PendingReplyFacts,
  startedAt: Date,
  absences: Parameters<typeof calcReplyDueAt>[1]
): Date | null =>
  pending.retakeOpen
    ? null
    : calcReplyDueAt(
        replyClockStart(pending.oldestUnrepliedAt, startedAt, pending.lastRetakeClosedAt),
        absences
      )

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

/** コーチの一覧（並べ方と区分は画面で決める） */
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
      closedAt: thread.closedAt,
      decidedAt: thread.decidedAt,
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
  return toSummaries(rows, { userId: coachUserId, side: 'coach' })
}

/** 生徒の一覧（始めた新しい順。区分は画面で決める） */
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
      closedAt: thread.closedAt,
      decidedAt: thread.decidedAt,
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
  return toSummaries(rows, { userId: studentUserId, side: 'student' })
}
