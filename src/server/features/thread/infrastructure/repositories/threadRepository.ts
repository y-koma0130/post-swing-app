import 'server-only'
import { and, asc, eq, gt, inArray, isNull, lt, lte, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { chatMessage, reply, reviewCard, thread, video } from '@/server/db/schema'
import type { StoredVideo } from '../../application/usecases/authorizeVideo.usecase'
import type { NewChatMessage } from '../../application/usecases/sendChatMessage.usecase'
import type { NewReply } from '../../application/usecases/sendReply.usecase'
import type { NewVideo } from '../../application/usecases/submitVideo.usecase'
import { type NewThread, type Thread, threadSchema } from '../../domain/values/Thread'

export type FindThread = (threadId: string) => Promise<Thread | null>
export const findThread: FindThread = async (threadId) => {
  const db = getDb()
  const row = await db.select().from(thread).where(eq(thread.id, threadId)).get()
  if (!row) {
    return null
  }
  const [videos, messages] = await Promise.all([
    db
      .select({
        id: video.id,
        uploadedAt: video.uploadedAt,
        note: video.note,
        replyId: reply.id,
      })
      .from(video)
      .leftJoin(reply, eq(reply.videoId, video.id))
      .where(eq(video.threadId, threadId))
      .orderBy(asc(video.uploadedAt))
      .all(),
    db
      .select()
      .from(chatMessage)
      .where(eq(chatMessage.threadId, threadId))
      .orderBy(asc(chatMessage.sentAt))
      .all(),
  ])
  return threadSchema.parse({
    ...row,
    videos: videos.map((v) => ({
      id: v.id,
      uploadedAt: v.uploadedAt,
      note: v.note,
      replied: v.replyId !== null,
    })),
    messages: messages.map((m) => ({
      id: m.id,
      videoId: m.videoId,
      from: m.senderRole,
      body: m.body,
      sentAt: m.sentAt,
    })),
  })
}

export type SaveVideo = (v: NewVideo) => Promise<void>
export const saveVideo: SaveVideo = async (v) => {
  const db = getDb()
  await db.batch([
    db.insert(video).values({
      id: v.id,
      threadId: v.threadId,
      r2Key: v.r2Key,
      contentType: v.contentType,
      sizeBytes: v.sizeBytes,
      note: v.note,
      frameRate: v.frameRate,
      uploadedAt: v.uploadedAt,
    }),
    db
      .update(thread)
      .set({
        status: v.nextStatus,
        ...(v.theme === null ? {} : { theme: v.theme }),
        updatedAt: v.uploadedAt,
      })
      .where(eq(thread.id, v.threadId)),
  ])
}

export type FindStoredVideo = (videoId: string) => Promise<StoredVideo | null>
export const findStoredVideo: FindStoredVideo = async (videoId) => {
  const row = await getDb()
    .select({
      r2Key: video.r2Key,
      contentType: video.contentType,
      deletedAt: video.deletedAt,
      coachUserId: thread.coachUserId,
      studentUserId: thread.studentUserId,
    })
    .from(video)
    .innerJoin(thread, eq(thread.id, video.threadId))
    .where(eq(video.id, videoId))
    .get()
  if (!row) {
    return null
  }
  return {
    r2Key: row.r2Key,
    contentType: row.contentType,
    deleted: row.deletedAt !== null,
    members: { coachUserId: row.coachUserId, studentUserId: row.studentUserId },
  }
}

/** 複数のスレッドの動画の本数（一覧用） */
export const countVideosByThread = async (threadIds: string[]): Promise<Map<string, number>> => {
  if (threadIds.length === 0) return new Map()
  const rows = await getDb()
    .select({ threadId: video.threadId })
    .from(video)
    .where(inArray(video.threadId, threadIds))
    .all()
  const counts = new Map<string, number>()
  for (const row of rows) {
    counts.set(row.threadId, (counts.get(row.threadId) ?? 0) + 1)
  }
  return counts
}

export type SaveReply = (r: NewReply) => Promise<void>
export const saveReply: SaveReply = async (r) => {
  const db = getDb()
  const [firstCard, ...restCards] = r.cards.map((card) =>
    db.insert(reviewCard).values({
      id: card.id,
      replyId: r.id,
      sortOrder: card.sortOrder,
      position: card.position,
      timeSec: card.timeSec,
      annotations: card.annotations,
      comment: card.comment,
      imageR2Key: card.imageR2Key,
      drillId: card.drillId,
    })
  )
  if (!firstCard) return
  await db.batch([
    db.insert(reply).values({ id: r.id, videoId: r.videoId, sentAt: r.sentAt }),
    firstCard,
    ...restCards,
    db
      .update(thread)
      .set({ status: r.nextStatus, updatedAt: r.sentAt })
      .where(eq(thread.id, r.threadId)),
  ])
}

export type SaveChatMessage = (m: NewChatMessage) => Promise<void>
export const saveChatMessage: SaveChatMessage = async (m) => {
  const db = getDb()
  await db.batch([
    db.insert(chatMessage).values({
      id: m.id,
      threadId: m.threadId,
      videoId: m.videoId,
      senderRole: m.senderRole,
      senderUserId: m.senderUserId,
      body: m.body,
      sentAt: m.sentAt,
    }),
    db
      .update(thread)
      .set({ status: m.nextStatus, updatedAt: m.sentAt })
      .where(eq(thread.id, m.threadId)),
  ])
}

export type FindStoredCardImage = (cardId: string) => Promise<StoredVideo | null>
/** カード画像の場所と、見てよい人（動画と同じく、担当のコーチと本人の生徒） */
export const findStoredCardImage: FindStoredCardImage = async (cardId) => {
  const row = await getDb()
    .select({
      r2Key: reviewCard.imageR2Key,
      coachUserId: thread.coachUserId,
      studentUserId: thread.studentUserId,
    })
    .from(reviewCard)
    .innerJoin(reply, eq(reply.id, reviewCard.replyId))
    .innerJoin(video, eq(video.id, reply.videoId))
    .innerJoin(thread, eq(thread.id, video.threadId))
    .where(eq(reviewCard.id, cardId))
    .get()
  if (!row) return null
  return {
    r2Key: row.r2Key,
    contentType: 'image/png',
    deleted: false,
    members: { coachUserId: row.coachUserId, studentUserId: row.studentUserId },
  }
}

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

export type FindThreadsExpiringBetween = (
  from: Date,
  to: Date
) => Promise<Array<{ id: string; studentUserId: string }>>
export const findThreadsExpiringBetween: FindThreadsExpiringBetween = async (from, to) =>
  getDb()
    .select({ id: thread.id, studentUserId: thread.studentUserId })
    .from(thread)
    .where(and(ne(thread.status, 'closed'), gt(thread.expiresAt, from), lte(thread.expiresAt, to)))
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

/** 都度払いは申し込み、月額は請求で、すでにスレッドがあるか（Webhook が二重に届いても1つだけ作る） */
export type ThreadExists = (key: { purchaseId: string } | { invoiceId: string }) => Promise<boolean>
export const threadExists: ThreadExists = async (key) => {
  const where =
    'invoiceId' in key
      ? eq(thread.stripeInvoiceId, key.invoiceId)
      : eq(thread.purchaseId, key.purchaseId)
  const row = await getDb().select({ id: thread.id }).from(thread).where(where).get()
  return row !== undefined
}

export type CreateThread = (t: NewThread) => Promise<void>
export const createThread: CreateThread = async (t) => {
  const now = new Date()
  await getDb()
    .insert(thread)
    .values({ ...t, createdAt: now, updatedAt: now })
}
