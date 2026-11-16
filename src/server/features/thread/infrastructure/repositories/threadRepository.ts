import 'server-only'
import { and, asc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  absenceAck,
  chatMessage,
  reply,
  replyDrill,
  reviewCard,
  submission,
  thread,
  threadNotice,
  threadRead,
  video,
} from '@/server/db/schema'
import type { ThreadMembers } from '../../application/dto/ThreadDetail.dto'
import type { StoredVideo } from '../../application/usecases/authorizeVideo.usecase'
import type { NewChatMessage } from '../../application/usecases/sendChatMessage.usecase'
import type { NewReply } from '../../application/usecases/sendReply.usecase'
import type { NewSubmission } from '../../application/usecases/submitSubmission.usecase'
import type { NewDraftVideo } from '../../application/usecases/uploadVideo.usecase'
import type { ThreadCard } from '../../domain/services/checkQuoteTarget.service'
import { type ChatMessage, chatMessageSchema } from '../../domain/values/ChatMessage'
import { type DraftVideo, isUnusedDraft } from '../../domain/values/Submission'
import { type NewThread, type Thread, threadSchema } from '../../domain/values/Thread'
import type { NewThreadNotice } from '../../domain/values/ThreadNotice'

export type FindThread = (threadId: string) => Promise<Thread | null>
export const findThread: FindThread = async (threadId) => {
  const db = getDb()
  const row = await db.select().from(thread).where(eq(thread.id, threadId)).get()
  if (!row) {
    return null
  }
  const [submissions, videos, messages] = await Promise.all([
    db
      .select({
        id: submission.id,
        submittedAt: submission.submittedAt,
        note: submission.note,
        replyId: reply.id,
      })
      .from(submission)
      .leftJoin(reply, eq(reply.submissionId, submission.id))
      .where(eq(submission.threadId, threadId))
      .orderBy(asc(submission.submittedAt))
      .all(),
    db
      .select({ id: video.id, submissionId: video.submissionId, angle: video.angle })
      .from(video)
      .where(and(eq(video.threadId, threadId), isNotNull(video.submissionId)))
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
    submissions: submissions.map((s) => ({
      id: s.id,
      submittedAt: s.submittedAt,
      note: s.note,
      videos: videos
        .filter((v) => v.submissionId === s.id)
        .map((v) => ({ id: v.id, angle: v.angle })),
      replied: s.replyId !== null,
    })),
    messages: messages.map(toChatMessage),
  })
}

/** 保存したチャットの行を domain の形にする（引用の JSON はここで検証する） */
const toChatMessage = (m: typeof chatMessage.$inferSelect): ChatMessage =>
  chatMessageSchema.parse({
    id: m.id,
    from: m.senderRole,
    body: m.body,
    sentAt: m.sentAt,
    attachment:
      m.attachmentKind === 'drill'
        ? { kind: 'drill', title: m.drillTitle ?? '', description: m.drillDescription ?? '' }
        : m.attachmentKind === 'video' && m.videoId
          ? { kind: 'video', videoId: m.videoId }
          : { kind: 'none' },
    quote: m.quote ?? null,
  })

export type SaveDraftVideo = (v: NewDraftVideo) => Promise<void>
/** 提出前の動画（下書き）を記録する。スレッドの状態は変えない */
export const saveDraftVideo: SaveDraftVideo = async (v) => {
  await getDb()
    .insert(video)
    .values({ ...v, submissionId: null, chatMessageId: null })
}

export type FindDraftVideos = (videoIds: ReadonlyArray<string>) => Promise<DraftVideo[]>
export const findDraftVideos: FindDraftVideos = async (videoIds) => {
  if (videoIds.length === 0) return []
  return getDb()
    .select({
      id: video.id,
      threadId: video.threadId,
      uploaderUserId: video.uploaderUserId,
      submissionId: video.submissionId,
      chatMessageId: video.chatMessageId,
      angle: video.angle,
    })
    .from(video)
    .where(and(inArray(video.id, [...videoIds]), isNull(video.deletedAt)))
    .all()
}

export type FindDraftVideo = (videoId: string) => Promise<DraftVideo | null>
export const findDraftVideo: FindDraftVideo = async (videoId) =>
  (await findDraftVideos([videoId]))[0] ?? null

export type FindThreadCards = (threadId: string) => Promise<ThreadCard[]>
/** スレッドの添削カード（引用先の確認に使う） */
export const findThreadCards: FindThreadCards = async (threadId) =>
  getDb()
    .select({
      id: reviewCard.id,
      submissionId: reply.submissionId,
      position: reviewCard.position,
    })
    .from(reviewCard)
    .innerJoin(reply, eq(reply.id, reviewCard.replyId))
    .innerJoin(submission, eq(submission.id, reply.submissionId))
    .where(eq(submission.threadId, threadId))
    .all()

export type SaveSubmission = (s: NewSubmission) => Promise<void>
/** 提出を作り、動画をひも付け、スレッドの状態（と最初ならテーマ）を変える。まとめて1回で書く */
export const saveSubmission: SaveSubmission = async (s) => {
  const db = getDb()
  await db.batch([
    db.insert(submission).values({
      id: s.id,
      threadId: s.threadId,
      note: s.note,
      submittedAt: s.submittedAt,
      sentDuringAbsenceId: s.sentDuringAbsenceId,
    }),
    db
      .update(video)
      .set({ submissionId: s.id })
      .where(
        and(
          inArray(video.id, [...s.videoIds]),
          eq(video.threadId, s.threadId),
          isNull(video.submissionId)
        )
      ),
    db
      .update(thread)
      .set({
        status: s.nextStatus,
        ...(s.theme === null ? {} : { theme: s.theme }),
        updatedAt: s.submittedAt,
      })
      .where(eq(thread.id, s.threadId)),
  ])
}

export type FindStoredVideo = (videoId: string) => Promise<StoredVideo | null>
export const findStoredVideo: FindStoredVideo = async (videoId) => {
  const row = await getDb()
    .select({
      r2Key: video.r2Key,
      contentType: video.contentType,
      deletedAt: video.deletedAt,
      submissionId: video.submissionId,
      chatMessageId: video.chatMessageId,
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
    draft: isUnusedDraft(row),
    members: { coachUserId: row.coachUserId, studentUserId: row.studentUserId },
  }
}

/** 複数のスレッドの提出の回数（一覧用） */
export const countSubmissionsByThread = async (
  threadIds: string[]
): Promise<Map<string, number>> => {
  if (threadIds.length === 0) return new Map()
  const rows = await getDb()
    .select({ threadId: submission.threadId })
    .from(submission)
    .where(inArray(submission.threadId, threadIds))
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
      videoId: card.videoId,
      sortOrder: card.sortOrder,
      position: card.position,
      timeSec: card.timeSec,
      annotations: card.annotations,
      comment: card.comment,
      imageR2Key: card.imageR2Key,
      drillId: null,
    })
  )
  if (!firstCard) return
  await db.batch([
    db.insert(reply).values({
      id: r.id,
      submissionId: r.submissionId,
      comment: r.comment,
      sentAt: r.sentAt,
    }),
    ...r.drills.map((d, sortOrder) =>
      db.insert(replyDrill).values({
        replyId: r.id,
        sortOrder,
        drillId: d.drillId,
        title: d.title,
        description: d.description,
      })
    ),
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
      senderRole: m.senderRole,
      senderUserId: m.senderUserId,
      body: m.body,
      attachmentKind: m.attachment.kind,
      drillTitle: m.attachment.kind === 'drill' ? m.attachment.title : null,
      drillDescription: m.attachment.kind === 'drill' ? m.attachment.description : null,
      videoId: m.attachment.kind === 'video' ? m.attachment.videoId : null,
      quote: m.quote,
      sentAt: m.sentAt,
      sentDuringAbsenceId: m.sentDuringAbsenceId,
    }),
    // 添えた動画を、このメッセージにひも付ける（下書きでなくなる）
    ...(m.attachment.kind === 'video'
      ? [
          db
            .update(video)
            .set({ chatMessageId: m.id })
            .where(
              and(
                eq(video.id, m.attachment.videoId),
                eq(video.threadId, m.threadId),
                isNull(video.submissionId),
                isNull(video.chatMessageId)
              )
            ),
        ]
      : []),
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
    .innerJoin(submission, eq(submission.id, reply.submissionId))
    .innerJoin(thread, eq(thread.id, submission.threadId))
    .where(eq(reviewCard.id, cardId))
    .get()
  if (!row) return null
  return {
    r2Key: row.r2Key,
    contentType: 'image/png',
    deleted: false,
    draft: false,
    members: { coachUserId: row.coachUserId, studentUserId: row.studentUserId },
  }
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

export type ThreadPayment = Readonly<{
  threadId: string
  purchaseId: string
  /** 月額の請求。都度払いなら null（申し込みの Checkout で払っている） */
  stripeInvoiceId: string | null
  refunded: boolean
}>
export type FindThreadPayment = (threadId: string) => Promise<ThreadPayment | null>
/** スレッドを作った支払い（返金のときに使う） */
export const findThreadPayment: FindThreadPayment = async (threadId) => {
  const row = await getDb()
    .select({
      purchaseId: thread.purchaseId,
      stripeInvoiceId: thread.stripeInvoiceId,
      refundedAt: thread.refundedAt,
    })
    .from(thread)
    .where(eq(thread.id, threadId))
    .get()
  return row
    ? {
        threadId,
        purchaseId: row.purchaseId,
        stripeInvoiceId: row.stripeInvoiceId,
        refunded: row.refundedAt !== null,
      }
    : null
}

export type MarkThreadRefunded = (threadId: string, refundedAt: Date) => Promise<void>
/** 返金したスレッドを終了する */
export const markThreadRefunded: MarkThreadRefunded = async (threadId, refundedAt) => {
  await getDb()
    .update(thread)
    .set({ status: 'closed', closedAt: refundedAt, refundedAt, updatedAt: refundedAt })
    .where(eq(thread.id, threadId))
}

export type SaveThreadNotice = (notice: NewThreadNotice) => Promise<void>
/** 不在のお知らせ。同じ不在・同じスレッドにすでにあれば何もしない（一意制約） */
export const saveThreadNotice: SaveThreadNotice = async (notice) => {
  await getDb().insert(threadNotice).values(notice).onConflictDoNothing()
}

export type SaveAbsenceAck = (input: {
  studentUserId: string
  threadId: string
  absenceId: string
  at: Date
}) => Promise<void>
export const saveAbsenceAck: SaveAbsenceAck = async ({
  studentUserId,
  threadId,
  absenceId,
  at,
}) => {
  await getDb()
    .insert(absenceAck)
    .values({ studentUserId, threadId, absenceId, createdAt: at })
    .onConflictDoNothing()
}

export type FindThreadMembers = (threadId: string) => Promise<ThreadMembers | null>
export const findThreadMembers: FindThreadMembers = async (threadId) =>
  (await getDb()
    .select({ coachUserId: thread.coachUserId, studentUserId: thread.studentUserId })
    .from(thread)
    .where(eq(thread.id, threadId))
    .get()) ?? null

export type SaveThreadRead = (input: {
  threadId: string
  userId: string
  at: Date
}) => Promise<void>
/** 最後に開いた時刻を更新する */
export const saveThreadRead: SaveThreadRead = async ({ threadId, userId, at }) => {
  await getDb()
    .insert(threadRead)
    .values({ threadId, userId, lastReadAt: at })
    .onConflictDoUpdate({
      target: [threadRead.threadId, threadRead.userId],
      set: { lastReadAt: at },
    })
}
