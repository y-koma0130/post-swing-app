import 'server-only'
import { and, desc, eq, inArray, isNull, min } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { getDb } from '@/server/db/client'
import { coachProfile, purchase, reply, submission, thread, user } from '@/server/db/schema'
import { findCoachAvailabilityFactsForCoaches } from '@/server/features/coach/public'
import type { AdminThreadRowDto } from '../../application/dto/AdminThreadRow.dto'
import { calcEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'

/** 一覧に出す件数（新しく動いた順） */
const LIMIT = 100

export type ListThreadsForAdmin = () => Promise<AdminThreadRowDto[]>

/** 管理画面のスレッド一覧。返信の遅れと返金の状態を一緒に見る */
export const listThreadsForAdmin: ListThreadsForAdmin = async () => {
  const db = getDb()
  const student = alias(user, 'student')
  const rows = await db
    .select({
      id: thread.id,
      coachName: coachProfile.displayName,
      studentName: student.name,
      planKind: thread.planKind,
      priceYen: purchase.priceYen,
      systemFeeYen: purchase.systemFeeYen,
      status: thread.status,
      startedAt: thread.startedAt,
      expiresAt: thread.expiresAt,
      refundedAt: thread.refundedAt,
      coachUserId: thread.coachUserId,
    })
    .from(thread)
    .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
    .innerJoin(student, eq(student.id, thread.studentUserId))
    .innerJoin(purchase, eq(purchase.id, thread.purchaseId))
    .orderBy(desc(thread.updatedAt))
    .limit(LIMIT)
    .all()
  if (rows.length === 0) return []

  const unreplied = await db
    .select({ threadId: submission.threadId, oldest: min(submission.submittedAt) })
    .from(submission)
    .leftJoin(reply, eq(reply.submissionId, submission.id))
    .where(
      and(
        inArray(
          submission.threadId,
          rows.map((r) => r.id)
        ),
        isNull(reply.id)
      )
    )
    .groupBy(submission.threadId)
    .all()

  const facts = await findCoachAvailabilityFactsForCoaches(rows.map((r) => r.coachUserId))
  return rows.map(({ coachUserId, ...r }) => ({
    ...r,
    // 期限はコーチの不在の分だけ延びる
    expiresAt: calcEffectiveExpiry(r, facts.get(coachUserId)?.absences ?? []).expiresAt,
    oldestUnrepliedAt: unreplied.find((u) => u.threadId === r.id)?.oldest ?? null,
  }))
}
