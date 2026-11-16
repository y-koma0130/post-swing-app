import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachAbsence, coachProfile } from './coach'
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
    /** 管理者が返金した日時（返金したスレッドは終了する） */
    refundedAt: integer({ mode: 'timestamp_ms' }),
    /** 月額で、この請求の支払いから作ったスレッド（同じ請求で2つ作らないため） */
    stripeInvoiceId: text().unique(),
    ...timestamps,
  },
  (t) => [
    index('thread_coach_status_idx').on(t.coachUserId, t.status),
    index('thread_student_idx').on(t.studentUserId),
  ]
)

/** 生徒の提出（1回に動画1〜2本とメモ）。コーチは提出ごとに1回添削を返す */
export const submission = sqliteTable(
  'submission',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    note: text().notNull(),
    submittedAt: integer({ mode: 'timestamp_ms' }).notNull(),
    /** 提出したとき、コーチが不在中だったか（あとで返信時間を集計するときに除く） */
    sentDuringAbsenceId: text(),
  },
  (t) => [index('submission_thread_idx').on(t.threadId)]
)

/**
 * 生徒が上げた動画。本体は R2 に置き、ここには場所だけを持つ。
 * 上げた時点では下書き（submission_id も chat_message_id も null）で、提出やチャットを送ったときにひも付ける。
 * 下書きは本人にしか見せず、24時間で消す
 */
export const video = sqliteTable(
  'video',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    /** 提出の動画なら、その提出 */
    submissionId: text().references(() => submission.id),
    /** コーチがチャットで送った動画なら、そのメッセージ（提出にもチャットにも付いていなければ下書き） */
    chatMessageId: text(),
    uploaderUserId: text()
      .notNull()
      .references(() => user.id),
    angle: text({ enum: ['front', 'back', 'other'] }).notNull(),
    r2Key: text().notNull(),
    contentType: text().notNull(),
    sizeBytes: integer().notNull(),
    /** 送る前にブラウザで測った長さ（秒）。測れなかったときは null */
    durationSec: real(),
    /** 送る前にブラウザで測ったフレームレート。分からない（変換せずに送った）ときは null */
    frameRate: real(),
    uploadedAt: integer({ mode: 'timestamp_ms' }).notNull(),
    /** 保存期間を過ぎて R2 から消した日時 */
    deletedAt: integer({ mode: 'timestamp_ms' }),
  },
  (t) => [
    index('video_thread_idx').on(t.threadId),
    index('video_submission_idx').on(t.submissionId),
  ]
)

/** 提出へのコーチの添削（添削カードをまとめて1通で送る） */
export const reply = sqliteTable('reply', {
  id: text().primaryKey(),
  submissionId: text()
    .notNull()
    .unique()
    .references(() => submission.id),
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
    /** どの動画（正面・後方など）から作ったカードか */
    videoId: text()
      .notNull()
      .references(() => video.id),
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

/** チャット。スレッドに1本の流れ（生徒はスレッド全体で上限まで） */
export const chatMessage = sqliteTable(
  'chat_message',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    senderRole: text({ enum: ['coach', 'student'] }).notNull(),
    senderUserId: text()
      .notNull()
      .references(() => user.id),
    /** 添付だけのメッセージでは空 */
    body: text().notNull(),
    /** 添えたもの（コーチだけ）。ドリルは送った時点の中身を写して持つ */
    attachmentKind: text({ enum: ['none', 'drill', 'video'] })
      .notNull()
      .default('none'),
    drillTitle: text(),
    drillDescription: text(),
    videoId: text().references(() => video.id),
    /** 引用（domain の chatQuoteSchema で検証した JSON）。引用していなければ null */
    quote: text({ mode: 'json' }),
    sentAt: integer({ mode: 'timestamp_ms' }).notNull(),
    /** 送られたとき、コーチが不在中だったか（あとで返信時間を集計するときに除く） */
    sentDuringAbsenceId: text(),
  },
  (t) => [index('chat_message_thread_idx').on(t.threadId)]
)

/** 生徒がチャットで「この不在期間中は次から表示しない」を選んだ記録 */
export const absenceAck = sqliteTable(
  'absence_ack',
  {
    studentUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    absenceId: text()
      .notNull()
      .references(() => coachAbsence.id, { onDelete: 'cascade' }),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.studentUserId, t.threadId, t.absenceId] })]
)

/**
 * スレッドに出すシステムメッセージ（不在中に動画・チャットが送られたとき）
 * 同じ不在・同じスレッドでは1回だけ（一意制約でも守る）。不在を消しても残るよう、終了日を写して持つ
 */
export const threadNotice = sqliteTable(
  'thread_notice',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .references(() => thread.id),
    /** どの提出のときに出したか */
    submissionId: text()
      .notNull()
      .references(() => submission.id),
    absenceId: text().notNull(),
    absenceEndDate: text().notNull(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [uniqueIndex('thread_notice_absence_idx').on(t.threadId, t.absenceId)]
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

/** スレッドを最後に開いた時刻（人ごと）。未読の表示と、通知をまとめるのに使う */
export const threadRead = sqliteTable(
  'thread_read',
  {
    threadId: text()
      .notNull()
      .references(() => thread.id),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    lastReadAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.threadId, t.userId] })]
)
