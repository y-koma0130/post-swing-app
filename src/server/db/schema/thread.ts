import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
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
