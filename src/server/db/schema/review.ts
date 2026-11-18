import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachProfile } from './coach'
import { thread } from './thread'

/** 終わったスレッドへの生徒のレビュー。コーチは返信できる */
export const coachReview = sqliteTable(
  'coach_review',
  {
    id: text().primaryKey(),
    threadId: text()
      .notNull()
      .unique()
      .references(() => thread.id),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId),
    studentUserId: text()
      .notNull()
      .references(() => user.id),
    rating: integer().notNull(),
    comment: text().notNull(),
    coachReply: text(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    repliedAt: integer({ mode: 'timestamp_ms' }),
  },
  (t) => [index('coach_review_coach_idx').on(t.coachUserId)]
)
