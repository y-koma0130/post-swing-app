import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachProfile } from './coach'
import { thread } from './thread'

/**
 * 生徒ごとのカルテ（コーチと生徒の組ごとに1つ）。コーチだけが見る（生徒には一切見せない）
 */
export const studentChart = sqliteTable(
  'student_chart',
  {
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    studentUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** 悩み・体の特徴・目標などの自由なメモ */
    memo: text().notNull().default(''),
    /** タグ（「スライス」「初心者」など）の JSON の配列 */
    tags: text({ mode: 'json' }).$type<string[]>().notNull().default([]),
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.coachUserId, t.studentUserId] })]
)

/** カルテのレッスンの記録（日付つきで書き足していく短いメモ）。のちの AI サマリーの材料にもする */
export const studentChartEntry = sqliteTable(
  'student_chart_entry',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    studentUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text().notNull(),
    /** どのスレッドのときに書いたか（スレッドの画面から書いたとき）。なければ null */
    threadId: text().references(() => thread.id),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('student_chart_entry_pair_idx').on(t.coachUserId, t.studentUserId)]
)
