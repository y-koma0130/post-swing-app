import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachProfile } from './coach'
import { purchase } from './purchase'

const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
}

/** スレッド（1つのテーマを30日間見る単位） */
export const thread = sqliteTable(
  'thread',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId),
    studentUserId: text()
      .notNull()
      .references(() => user.id),
    purchaseId: text()
      .notNull()
      .references(() => purchase.id),
    planKind: text({ enum: ['trial', 'single', 'monthly'] }).notNull(),
    /** 生徒が最初の動画を送るときに書く */
    theme: text().notNull().default(''),
    status: text({ enum: ['waiting_student', 'waiting_coach', 'closed'] }).notNull(),
    startedAt: integer({ mode: 'timestamp_ms' }).notNull(),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    closedAt: integer({ mode: 'timestamp_ms' }),
    /** 月額で、この請求の支払いから作ったスレッド（同じ請求で2つ作らないため） */
    stripeInvoiceId: text().unique(),
    ...timestamps,
  },
  (t) => [
    index('thread_coach_status_idx').on(t.coachUserId, t.status),
    index('thread_student_idx').on(t.studentUserId),
  ]
)

/** 生徒が送った動画。本体は R2 に置き、ここには場所だけを持つ */
export const video = sqliteTable(
  'video',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    r2Key: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    note: text().notNull(),
    /** 送る前にブラウザで測ったフレームレート。分からない（変換せずに送った）ときは null */
    frameRate: real(),
    uploadedAt: integer({ mode: 'timestamp_ms' }).notNull(),
    /** 保存期間を過ぎて R2 から消した日時 */
    deletedAt: integer({ mode: 'timestamp_ms' }),
  },
  (t) => [index('video_thread_idx').on(t.threadId)]
)

/** 動画1本へのコーチの返信（添削カードをまとめて1通で送る） */
export const reply = sqliteTable('reply', {
  id: text().primaryKey(),
  videoId: text()
    .notNull()
    .unique()
    .references(() => video.id),
  sentAt: integer({ mode: 'timestamp_ms' }).notNull(),
})

/** 添削カード（キャプチャ画像＋線＋理由） */
export const reviewCard = sqliteTable(
  'review_card',
  {
    id: text().primaryKey(),
    replyId: text()
      .notNull()
      .references(() => reply.id),
    sortOrder: integer().notNull(),
    position: text({ enum: ['address', 'top', 'impact', 'finish'] }).notNull(),
    timeSec: real().notNull(),
    /** 線（0〜1 の座標）。domain の annotationSchema で検証した JSON */
    annotations: text({ mode: 'json' }).notNull(),
    comment: text().notNull(),
    /** 動画のコマと線を重ねた PNG */
    imageR2Key: text().notNull(),
    drillId: text(),
  },
  (t) => [index('review_card_reply_idx').on(t.replyId)]
)

/** チャット。動画ごとに数える（生徒は動画1本につき3通まで） */
export const chatMessage = sqliteTable(
  'chat_message',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    videoId: text()
      .notNull()
      .references(() => video.id),
    senderRole: text({ enum: ['coach', 'student'] }).notNull(),
    senderUserId: text()
      .notNull()
      .references(() => user.id),
    body: text().notNull(),
    sentAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('chat_message_thread_idx').on(t.threadId)]
)

/** コーチが登録するドリル。添削カードに添えて使い回す */
export const drill = sqliteTable(
  'drill',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    title: text().notNull(),
    description: text().notNull(),
    ...timestamps,
  },
  (t) => [index('drill_coach_idx').on(t.coachUserId)]
)
