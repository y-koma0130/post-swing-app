import 'server-only'
import { and, eq, gt, inArray, isNull, lt, lte, type SQL } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  chatMessage,
  reply,
  retakeRequest,
  submission,
  thread,
  threadNotice,
  threadRead,
  video,
} from '@/server/db/schema'
import { IN_LESSON_STATUSES } from '../../domain/rules'
import type { Thread } from '../../domain/values/Thread'
import { findThread } from './threadRepository'

/**
 * 毎日の処理（Cron）が使う読み書き：期限切れ・期限前・添削の遅れ・動画の削除・不在明けの件数
 */

export type FindExpiredOpenThreads = (now: Date) => Promise<Thread[]>
export const findExpiredOpenThreads: FindExpiredOpenThreads = async (now) => {
  const rows = await getDb()
    .select({ id: thread.id })
    .from(thread)
    .where(and(inArray(thread.status, [...IN_LESSON_STATUSES]), lte(thread.expiresAt, now)))
    .all()
  const threads = await Promise.all(rows.map((row) => findThread(row.id)))
  return threads.filter((t): t is Thread => t !== null)
}

export type CloseThreads = (threadIds: string[], closedAt: Date) => Promise<void>
export const closeThreads: CloseThreads = async (threadIds, closedAt) => {
  await getDb()
    .update(thread)
    .set({ status: 'closed', closedAt, updatedAt: closedAt })
    .where(inArray(thread.id, threadIds))
}

export type FindOpenThreadsExpiringBy = (to: Date) => Promise<
  Array<{
    id: string
    coachUserId: string
    studentUserId: string
    startedAt: Date
    expiresAt: Date
  }>
>
/** 保存した期限が to より前の、終了していないスレッド（実際の期限は domain が不在の分だけ延ばして判定する） */
export const findOpenThreadsExpiringBy: FindOpenThreadsExpiringBy = async (to) =>
  getDb()
    .select({
      id: thread.id,
      coachUserId: thread.coachUserId,
      studentUserId: thread.studentUserId,
      startedAt: thread.startedAt,
      expiresAt: thread.expiresAt,
    })
    .from(thread)
    .where(and(inArray(thread.status, [...IN_LESSON_STATUSES]), lte(thread.expiresAt, to)))
    .all()

export type UnrepliedSubmission = {
  threadId: string
  coachUserId: string
  submittedAt: Date
  threadStartedAt: Date
  /** 撮り直しをお願いしていて、まだ返事がない */
  retakeOpen: boolean
  /** いちばん最後に撮り直しのお願いが終わった日時（なければ null） */
  lastRetakeClosedAt: Date | null
}
export type FindUnrepliedSubmissionsSince = (since: Date) => Promise<UnrepliedSubmission[]>
/** since より後に届き、まだ添削していない提出（レッスン中のスレッド）と、その撮り直しのお願いの様子 */
export const findUnrepliedSubmissionsSince: FindUnrepliedSubmissionsSince = async (since) => {
  const db = getDb()
  const rows = await db
    .select({
      id: submission.id,
      threadId: submission.threadId,
      coachUserId: thread.coachUserId,
      submittedAt: submission.submittedAt,
      threadStartedAt: thread.startedAt,
    })
    .from(submission)
    .innerJoin(thread, eq(thread.id, submission.threadId))
    .leftJoin(reply, eq(reply.submissionId, submission.id))
    .where(
      and(
        inArray(thread.status, [...IN_LESSON_STATUSES]),
        isNull(reply.id),
        gt(submission.submittedAt, since)
      )
    )
    .all()
  const requests =
    rows.length === 0
      ? []
      : await db
          .select({ submissionId: retakeRequest.submissionId, closedAt: retakeRequest.closedAt })
          .from(retakeRequest)
          .where(
            inArray(
              retakeRequest.submissionId,
              rows.map((r) => r.id)
            )
          )
          .all()
  return rows.map(({ id, ...row }) => {
    const mine = requests.filter((r) => r.submissionId === id)
    const closedTimes = mine.flatMap((r) => (r.closedAt ? [r.closedAt.getTime()] : []))
    return {
      ...row,
      retakeOpen: mine.some((r) => r.closedAt === null),
      lastRetakeClosedAt: closedTimes.length > 0 ? new Date(Math.max(...closedTimes)) : null,
    }
  })
}

export type FindVideosToDelete = (
  closedBefore: Date
) => Promise<Array<{ id: string; r2Key: string }>>
export const findVideosToDelete: FindVideosToDelete = async (closedBefore) =>
  getDb()
    .select({ id: video.id, r2Key: video.r2Key })
    .from(video)
    .innerJoin(thread, eq(thread.id, video.threadId))
    .where(
      and(
        inArray(thread.status, ['closed', 'declined']),
        lt(thread.closedAt, closedBefore),
        isNull(video.deletedAt)
      )
    )
    .all()

export type MarkVideosDeleted = (videoIds: string[], deletedAt: Date) => Promise<void>
export const markVideosDeleted: MarkVideosDeleted = async (videoIds, deletedAt) => {
  await getDb().update(video).set({ deletedAt }).where(inArray(video.id, videoIds))
}

export type FindDraftVideosToDelete = (
  createdBefore: Date
) => Promise<Array<{ id: string; r2Key: string }>>
export const findDraftVideosToDelete: FindDraftVideosToDelete = async (createdBefore) =>
  getDb()
    .select({ id: video.id, r2Key: video.r2Key })
    .from(video)
    .where(
      and(
        isNull(video.submissionId),
        isNull(video.chatMessageId),
        lt(video.uploadedAt, createdBefore)
      )
    )
    .all()

export type DeleteDraftVideos = (videoIds: string[]) => Promise<void>
export const deleteDraftVideos: DeleteDraftVideos = async (videoIds) => {
  await getDb()
    .delete(video)
    .where(
      and(inArray(video.id, videoIds), isNull(video.submissionId), isNull(video.chatMessageId))
    )
}

export type CountAbsenceBacklog = (
  absenceId: string
) => Promise<{ submissionCount: number; chatCount: number }>
/** 不在中に届いて、まだ添削していない提出と、生徒からの質問（チャット）の数 */
export const countAbsenceBacklog: CountAbsenceBacklog = async (absenceId) => {
  const db = getDb()
  const [submissions, chats] = await Promise.all([
    db
      .select({ id: submission.id })
      .from(submission)
      .innerJoin(thread, eq(thread.id, submission.threadId))
      .leftJoin(reply, eq(reply.submissionId, submission.id))
      .where(
        and(
          eq(submission.sentDuringAbsenceId, absenceId),
          isNull(reply.id),
          inArray(thread.status, [...IN_LESSON_STATUSES])
        )
      )
      .all(),
    db
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .where(
        and(eq(chatMessage.sentDuringAbsenceId, absenceId), eq(chatMessage.senderRole, 'student'))
      )
      .all(),
  ])
  return { submissionCount: submissions.length, chatCount: chats.length }
}

export type FindExpiredApplications = (
  requestedBefore: Date
) => Promise<Array<{ threadId: string; studentUserId: string; purchaseId: string }>>
/** requestedBefore より前に承認を待ち始めて、まだ決まっていない申し込み */
export const findExpiredApplications: FindExpiredApplications = async (requestedBefore) =>
  getDb()
    .select({
      threadId: thread.id,
      studentUserId: thread.studentUserId,
      purchaseId: thread.purchaseId,
    })
    .from(thread)
    .where(and(eq(thread.status, 'requested'), lt(thread.requestedAt, requestedBefore)))
    .all()

/** 消す下書きのスレッドと、その申し込み・動画の場所 */
export type DraftThreadToDelete = Readonly<{
  threadId: string
  purchaseId: string
  videoR2Keys: string[]
}>

const findDraftThreadsBy = async (where: SQL | undefined): Promise<DraftThreadToDelete[]> => {
  const db = getDb()
  const threads = await db
    .select({ id: thread.id, purchaseId: thread.purchaseId })
    .from(thread)
    .where(and(eq(thread.status, 'draft'), where))
    .all()
  if (threads.length === 0) return []
  const videos = await db
    .select({ threadId: video.threadId, r2Key: video.r2Key })
    .from(video)
    .where(
      and(
        inArray(
          video.threadId,
          threads.map((t) => t.id)
        ),
        isNull(video.deletedAt)
      )
    )
    .all()
  return threads.map((t) => ({
    threadId: t.id,
    purchaseId: t.purchaseId,
    videoR2Keys: videos.filter((v) => v.threadId === t.id).map((v) => v.r2Key),
  }))
}

export type FindDraftThreadsToDelete = (createdBefore: Date) => Promise<DraftThreadToDelete[]>
/** createdBefore より前に作り、カードを登録しないままの下書きのスレッドと、その動画の場所 */
export const findDraftThreadsToDelete: FindDraftThreadsToDelete = (createdBefore) =>
  findDraftThreadsBy(lt(thread.createdAt, createdBefore))

export type FindDraftThreadToDelete = (threadId: string) => Promise<DraftThreadToDelete | null>
/** 下書きのスレッド1つと、その動画の場所（下書きでなければ null） */
export const findDraftThreadToDelete: FindDraftThreadToDelete = async (threadId) =>
  (await findDraftThreadsBy(eq(thread.id, threadId)))[0] ?? null

export type DeleteDraftThreads = (threadIds: string[]) => Promise<void>
/**
 * 下書きのスレッドを、提出・動画・既読の記録ごと消す（コーチには見えていないので、残す理由がない）。
 * 申し込み（purchase）は、呼ぶ側が purchase の releasePendingPurchase で取り消す
 */
export const deleteDraftThreads: DeleteDraftThreads = async (threadIds) => {
  const db = getDb()
  const drafts = and(inArray(thread.id, threadIds), eq(thread.status, 'draft'))
  const ids = (await db.select({ id: thread.id }).from(thread).where(drafts).all()).map((t) => t.id)
  if (ids.length === 0) return
  await db.batch([
    db.delete(video).where(inArray(video.threadId, ids)),
    db.delete(threadNotice).where(inArray(threadNotice.threadId, ids)),
    db.delete(submission).where(inArray(submission.threadId, ids)),
    db.delete(threadRead).where(inArray(threadRead.threadId, ids)),
    db.delete(thread).where(inArray(thread.id, ids)),
  ])
}
