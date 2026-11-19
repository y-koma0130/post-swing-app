import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { user } from './auth'
import { coachProfile } from './coach'

/** 公開の許可で、生徒が選べる項目（domain の shareConsentChoicesSchema と同じ） */
const choices = {
  /** 添削をコーチの SNS で紹介してよいか（これが false なら、ほかの項目は使わない） */
  allowPublish: integer({ mode: 'boolean' }).notNull(),
  /** 顔をそのまま出してよいか（false なら、顔をぼかした画像だけ） */
  showFace: integer({ mode: 'boolean' }).notNull(),
  /** 年代を出してよいか */
  showAgeRange: integer({ mode: 'boolean' }).notNull(),
  /** 平均スコアを出してよいか */
  showScore: integer({ mode: 'boolean' }).notNull(),
  /** 同意したときの文面の版（domain の SHARE_RULES.consentTextVersion） */
  textVersion: text().notNull(),
}

/**
 * 添削の公開の許可（コーチと生徒の組ごとに1つ）。生徒が申し込みのときに選び、マイページから変えられる
 */
export const shareConsent = sqliteTable(
  'share_consent',
  {
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    studentUserId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...choices,
    updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.coachUserId, t.studentUserId] })]
)

/** 公開の許可を変えた履歴（いつ何に同意したかを、あとから確かめられるように。消さない） */
export const shareConsentLog = sqliteTable(
  'share_consent_log',
  {
    id: text().primaryKey(),
    coachUserId: text().notNull(),
    studentUserId: text().notNull(),
    ...choices,
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [index('share_consent_log_pair_idx').on(t.coachUserId, t.studentUserId)]
)
