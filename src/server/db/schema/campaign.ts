import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { coachProfile } from './coach'

/**
 * キャンペーン（何を・どれだけ・誰に配るかの定義）。いまはコーチの手数料の割引だけ。
 * 行はマイグレーションで入れる（管理画面での作成・編集はまだない）
 */
export const campaign = sqliteTable('campaign', {
  id: text().primaryKey(),
  /** コードから参照する固定のキー（early_adopter_2026 など） */
  code: text().notNull().unique(),
  name: text().notNull(),
  /** 特典の手数料率（0〜0.1。0なら無料） */
  feeRate: real().notNull(),
  /** 特典の日数 */
  durationDays: integer().notNull(),
  /** 特典をいつから数えるか（初めて申し込みを承認した日／付けた日） */
  anchor: text({ enum: ['first_approval', 'granted'] }).notNull(),
  /** 付与の上限。取り消した特典は数えない。null なら上限なし */
  maxGrants: integer(),
  /** 新しく付けられるか */
  active: integer({ mode: 'boolean' }).notNull(),
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
})

/**
 * コーチに付いた手数料の特典。付けた時点のキャンペーンの率と日数を写して持つ
 * （あとでキャンペーンを変えても、付いた特典は変わらない）。取り消しても行は消さない
 */
export const coachFeeGrant = sqliteTable(
  'coach_fee_grant',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    campaignId: text()
      .notNull()
      .references(() => campaign.id),
    feeRate: real().notNull(),
    durationDays: integer().notNull(),
    /** 有効な期間。日本時間の YYYY-MM-DD で、両端を含む。始まるまでは null */
    startDate: text(),
    endDate: text(),
    revokedAt: integer({ mode: 'timestamp_ms' }),
    createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  },
  (t) => [
    // 同じコーチに同じキャンペーンは1回だけ（取り消したあとも付け直さない）
    uniqueIndex('coach_fee_grant_coach_campaign_idx').on(t.coachUserId, t.campaignId),
    index('coach_fee_grant_campaign_idx').on(t.campaignId),
  ]
)
