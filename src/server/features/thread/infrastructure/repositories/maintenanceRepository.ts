import 'server-only'
import { and, eq, gt, inArray, isNull, lt, lte, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { chatMessage, reply, submission, thread, video } from '@/server/db/schema'
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
    .where(and(ne(thread.status, 'closed'), lte(thread.expiresAt, now)))
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
    .where(and(ne(thread.status, 'closed'), lte(thread.expiresAt, to)))
    .all()

export type FindUnrepliedSubmissionsSince = (
  since: Date
) => Promise<Array<{ threadId: string; coachUserId: string; submittedAt: Date }>>
/** since より後に届き、まだ添削していない提出（終了していないスレッド） */
export const findUnrepliedSubmissionsSince: FindUnrepliedSubmissionsSince = async (since) =>
  getDb()
    .select({
      threadId: submission.threadId,
      coachUserId: thread.coachUserId,
      submittedAt: submission.submittedAt,
    })
    .from(submission)
    .innerJoin(thread, eq(thread.id, submission.threadId))
    .leftJoin(reply, eq(reply.submissionId, submission.id))
    .where(and(ne(thread.status, 'closed'), isNull(reply.id), gt(submission.submittedAt, since)))
    .all()

export type FindVideosToDelete = (
  closedBefore: Date
) => Promise<Array<{ id: string; r2Key: string }>>
export const findVideosToDelete: FindVideosToDelete = async (closedBefore) =>
  getDb()
    .select({ id: video.id, r2Key: video.r2Key })
    .from(video)
    .innerJoin(thread, eq(thread.id, video.threadId))
    .where(
      and(eq(thread.status, 'closed'), lt(thread.closedAt, closedBefore), isNull(video.deletedAt))
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
    .where(and(isNull(video.submissionId), lt(video.uploadedAt, createdBefore)))
    .all()

export type DeleteDraftVideos = (videoIds: string[]) => Promise<void>
export const deleteDraftVideos: DeleteDraftVideos = async (videoIds) => {
  await getDb()
    .delete(video)
    .where(and(inArray(video.id, videoIds), isNull(video.submissionId)))
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
          ne(thread.status, 'closed')
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
