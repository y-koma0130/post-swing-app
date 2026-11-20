import 'server-only'
import { and, asc, eq, inArray, isNotNull, like, lte, or } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  absenceAck,
  account,
  chatMessage,
  coachAbsence,
  coachFeeGrant,
  coachProfile,
  coachReview,
  drill,
  drillVideo,
  monitorCode,
  payment,
  plan,
  purchase,
  reply,
  replyDrill,
  retakeRequest,
  reviewCard,
  session,
  shareConsent,
  shareConsentLog,
  studentChart,
  studentChartEntry,
  submission,
  thread,
  threadNotice,
  threadRead,
  user,
  video,
  waitlistEntry,
} from '@/server/db/schema'
import { DEMO_EMAIL_DOMAIN } from '../../domain/rules'
import { isDemoSampleKey } from '../../domain/services/demoPeriod.service'
import type { DemoSeed } from './buildDemoSeed'

/**
 * デモのコーチとデータをまとめて書く（外部キーの順。1回の batch なので、途中で失敗したら何も残らない）。
 * D1 は1つの文に入れられる値が100個までなので、1行ずつ別の文にする
 */
export const saveDemoSeed = async (seed: DemoSeed): Promise<void> => {
  const db = getDb()
  const [first, ...rest] = [
    ...seed.users.map((row) => db.insert(user).values(row)),
    db.insert(coachProfile).values(seed.coach),
    ...seed.plans.map((row) => db.insert(plan).values(row)),
    ...seed.drills.map((row) => db.insert(drill).values(row)),
    ...seed.monitorCodes.map((row) => db.insert(monitorCode).values(row)),
    ...seed.purchases.map((row) => db.insert(purchase).values(row)),
    ...seed.threads.map((row) => db.insert(thread).values(row)),
    ...seed.submissions.map((row) => db.insert(submission).values(row)),
    ...seed.videos.map((row) => db.insert(video).values(row)),
    ...seed.replies.map((row) => db.insert(reply).values(row)),
    ...seed.replyDrills.map((row) => db.insert(replyDrill).values(row)),
    ...seed.chatMessages.map((row) => db.insert(chatMessage).values(row)),
    ...seed.reviews.map((row) => db.insert(coachReview).values(row)),
    ...seed.charts.map((row) => db.insert(studentChart).values(row)),
    ...seed.chartEntries.map((row) => db.insert(studentChartEntry).values(row)),
    ...seed.shareConsents.map((row) => db.insert(shareConsent).values(row)),
    ...seed.reads.map((row) => db.insert(threadRead).values(row)),
  ]
  if (!first) return
  await db.batch([first, ...rest])
}

export type DemoCoachRow = Readonly<{ userId: string; name: string; expiresAt: Date }>

/** デモ用のリンクのトークン（のハッシュ）から、デモのコーチを探す */
export const findDemoCoachByTokenHash = async (tokenHash: string): Promise<DemoCoachRow | null> => {
  const row = await getDb()
    .select({
      userId: coachProfile.userId,
      name: coachProfile.displayName,
      expiresAt: coachProfile.demoExpiresAt,
    })
    .from(coachProfile)
    .where(eq(coachProfile.demoTokenHash, tokenHash))
    .get()
  return row?.expiresAt ? { userId: row.userId, name: row.name, expiresAt: row.expiresAt } : null
}

/** デモのコーチの期限（デモでなければ null） */
export const findDemoExpiry = async (coachUserId: string): Promise<Date | null> => {
  const row = await getDb()
    .select({ expiresAt: coachProfile.demoExpiresAt })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  return row?.expiresAt ?? null
}

/** デモのコーチの一覧（期限が近い順） */
export const listDemoCoaches = async (): Promise<DemoCoachRow[]> => {
  const rows = await getDb()
    .select({
      userId: coachProfile.userId,
      name: coachProfile.displayName,
      expiresAt: coachProfile.demoExpiresAt,
    })
    .from(coachProfile)
    .where(isNotNull(coachProfile.demoExpiresAt))
    .orderBy(asc(coachProfile.demoExpiresAt))
    .all()
  return rows.flatMap((r) => (r.expiresAt ? [{ ...r, expiresAt: r.expiresAt }] : []))
}

/** 期限を過ぎたデモのコーチ */
export const findExpiredDemoCoaches = async (now: Date): Promise<string[]> =>
  (
    await getDb()
      .select({ userId: coachProfile.userId })
      .from(coachProfile)
      .where(lte(coachProfile.demoExpiresAt, now))
      .all()
  ).map((r) => r.userId)

/** デモ用のリンクを作り直す（前のリンクは使えなくなる） */
export const saveDemoTokenHash = async (
  coachUserId: string,
  tokenHash: string
): Promise<boolean> => {
  const result = await getDb()
    .update(coachProfile)
    .set({ demoTokenHash: tokenHash, updatedAt: new Date() })
    .where(and(eq(coachProfile.userId, coachUserId), isNotNull(coachProfile.demoExpiresAt)))
    .run()
  return result.meta.changes > 0
}

/**
 * デモのコーチを、データごと消す。消した R2 のキー（お手本の動画を除く）を返すので、呼ぶ側で消す。
 * デモでないコーチには何もしない（本物のデータを消さないように、最初に確かめる）
 */
export const deleteDemoCoachData = async (coachUserId: string): Promise<string[] | null> => {
  const db = getDb()
  const coach = await db
    .select({ demoExpiresAt: coachProfile.demoExpiresAt, avatarR2Key: coachProfile.avatarR2Key })
    .from(coachProfile)
    .where(eq(coachProfile.userId, coachUserId))
    .get()
  if (!coach?.demoExpiresAt) return null

  const threadIds = (
    await db.select({ id: thread.id }).from(thread).where(eq(thread.coachUserId, coachUserId)).all()
  ).map((t) => t.id)
  const submissionIds =
    threadIds.length === 0
      ? []
      : (
          await db
            .select({ id: submission.id })
            .from(submission)
            .where(inArray(submission.threadId, threadIds))
            .all()
        ).map((s) => s.id)
  const replyIds =
    submissionIds.length === 0
      ? []
      : (
          await db
            .select({ id: reply.id })
            .from(reply)
            .where(inArray(reply.submissionId, submissionIds))
            .all()
        ).map((r) => r.id)
  // デモの生徒（デモ用のドメインのアドレスの人だけ。本物の生徒は決して消さない）
  const studentIds =
    threadIds.length === 0
      ? []
      : (
          await db
            .selectDistinct({ id: user.id })
            .from(thread)
            .innerJoin(user, eq(user.id, thread.studentUserId))
            .where(
              and(eq(thread.coachUserId, coachUserId), like(user.email, `%@${DEMO_EMAIL_DOMAIN}`))
            )
            .all()
        ).map((u) => u.id)

  const keys = [
    ...(threadIds.length === 0
      ? []
      : await db
          .select({ key: video.r2Key })
          .from(video)
          .where(inArray(video.threadId, threadIds))
          .all()),
    ...(replyIds.length === 0
      ? []
      : await db
          .select({ key: reviewCard.imageR2Key })
          .from(reviewCard)
          .where(inArray(reviewCard.replyId, replyIds))
          .all()),
    ...(await db
      .select({ key: drillVideo.r2Key })
      .from(drillVideo)
      .where(eq(drillVideo.coachUserId, coachUserId))
      .all()),
    ...(coach.avatarR2Key ? [{ key: coach.avatarR2Key }] : []),
  ]
    .map((k) => k.key)
    .filter((key) => !isDemoSampleKey(key))

  const userIds = [coachUserId, ...studentIds]
  const inThreads = <T>(build: (ids: string[]) => T): T[] =>
    threadIds.length === 0 ? [] : [build(threadIds)]
  const [first, ...rest] = [
    ...(replyIds.length === 0
      ? []
      : [
          db.delete(reviewCard).where(inArray(reviewCard.replyId, replyIds)),
          db.delete(replyDrill).where(inArray(replyDrill.replyId, replyIds)),
          db.delete(reply).where(inArray(reply.id, replyIds)),
        ]),
    ...inThreads((ids) => db.delete(chatMessage).where(inArray(chatMessage.threadId, ids))),
    ...inThreads((ids) => db.delete(threadNotice).where(inArray(threadNotice.threadId, ids))),
    ...inThreads((ids) => db.delete(retakeRequest).where(inArray(retakeRequest.threadId, ids))),
    ...inThreads((ids) => db.delete(absenceAck).where(inArray(absenceAck.threadId, ids))),
    ...inThreads((ids) => db.delete(threadRead).where(inArray(threadRead.threadId, ids))),
    ...inThreads((ids) => db.delete(coachReview).where(inArray(coachReview.threadId, ids))),
    db.delete(studentChartEntry).where(eq(studentChartEntry.coachUserId, coachUserId)),
    ...inThreads((ids) => db.delete(video).where(inArray(video.threadId, ids))),
    ...inThreads((ids) => db.delete(submission).where(inArray(submission.threadId, ids))),
    db.delete(thread).where(eq(thread.coachUserId, coachUserId)),
    db.delete(payment).where(eq(payment.coachUserId, coachUserId)),
    db.delete(purchase).where(eq(purchase.coachUserId, coachUserId)),
    db.delete(waitlistEntry).where(eq(waitlistEntry.coachUserId, coachUserId)),
    db.delete(monitorCode).where(eq(monitorCode.coachUserId, coachUserId)),
    db.delete(shareConsentLog).where(eq(shareConsentLog.coachUserId, coachUserId)),
    db.delete(shareConsent).where(eq(shareConsent.coachUserId, coachUserId)),
    db.delete(studentChart).where(eq(studentChart.coachUserId, coachUserId)),
    db.delete(drill).where(eq(drill.coachUserId, coachUserId)),
    db.delete(drillVideo).where(eq(drillVideo.coachUserId, coachUserId)),
    db.delete(coachAbsence).where(eq(coachAbsence.coachUserId, coachUserId)),
    db.delete(coachFeeGrant).where(eq(coachFeeGrant.coachUserId, coachUserId)),
    db.delete(plan).where(eq(plan.coachUserId, coachUserId)),
    db.delete(threadRead).where(inArray(threadRead.userId, userIds)),
    ...(studentIds.length === 0
      ? []
      : [db.delete(absenceAck).where(inArray(absenceAck.studentUserId, studentIds))]),
    db.delete(coachProfile).where(eq(coachProfile.userId, coachUserId)),
    db.delete(session).where(inArray(session.userId, userIds)),
    db.delete(account).where(inArray(account.userId, userIds)),
    db
      .delete(user)
      .where(
        and(
          inArray(user.id, userIds),
          or(eq(user.id, coachUserId), like(user.email, `%@${DEMO_EMAIL_DOMAIN}`))
        )
      ),
  ]
  await db.batch([first, ...rest])
  return keys
}
