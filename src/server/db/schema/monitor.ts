import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { coachProfile } from './coach'

/**
 * モニター募集のプロモーションコード（コーチが発行する）。コードを入れた生徒は、1レッスンをモニター価格で申し込める。
 * 使った数は、このコードで申し込んだ purchase から数える
 */
export const monitorCode = sqliteTable(
  'monitor_code',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    /** 生徒が入れるコード（英大文字と数字。作り直すと変わる） */
    code: text().notNull().unique(),
    /** コーチ用の呼び名（「知人用」など。生徒には出さない） */
    label: text().notNull(),
    /** モニター価格（0なら無料。カードの登録なしで申し込める） */
    priceYen: integer().notNull(),
    /** 先着の人数 */
    maxUses: integer().notNull(),
    /** この日まで使える（日本時間の日付 YYYY-MM-DD）。なければ期限なし */
    expiresOn: text(),
    /** 受付中か（止めると、コードを入れても使えない） */
    active: integer({ mode: 'boolean' }).notNull(),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('monitor_code_coach_idx').on(t.coachUserId)]
)
