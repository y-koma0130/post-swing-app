import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { user } from './auth'

const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
}

/** コーチのプロフィール。user と1対1。この行があればコーチ */
export const coachProfile = sqliteTable('coach_profile', {
  userId: text()
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  slug: text().notNull().unique(),
  displayName: text().notNull(),
  title: text().notNull().default(''),
  bio: text().notNull().default(''),
  instagram: text().notNull().default(''),
  /** 資格（選択肢のコード。domain の coachLicenseSchema）の JSON の配列 */
  licenses: text({ mode: 'json' }).$type<string[]>().notNull().default([]),
  /** 選択肢にない資格（自由に書く） */
  licenseOther: text().notNull().default(''),
  monthlyCapacity: integer().notNull(),
  /** Stripe Connect の口座。口座開設前は null */
  stripeAccountId: text().unique(),
  /** Stripe で決済を受けられる状態か（account.updated で更新） */
  chargesEnabled: integer({ mode: 'boolean' }).notNull().default(false),
  /** 管理者が受付を止めた日時。止めている間は新しい申し込みを受けない（進行中のスレッドは続く） */
  suspendedAt: integer({ mode: 'timestamp_ms' }),
  /** プロフィール画像（R2 のキー。正方形の JPEG）。なければ null */
  avatarR2Key: text('avatar_r2_key'),
  /** 返信遅れフラグを立てた日時（7日で自動で外れる。判定は domain の isDelayFlagActive） */
  delayFlagSetAt: integer({ mode: 'timestamp_ms' }),
  ...timestamps,
})

/** コーチの不在期間。日付は日本時間の YYYY-MM-DD（終了日も不在に含む） */
export const coachAbsence = sqliteTable(
  'coach_absence',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    startDate: text().notNull(),
    endDate: text().notNull(),
    /** 生徒に見せる一言 */
    note: text().notNull().default(''),
    /** 不在中は受付ページからの新規申し込みを止める */
    pauseNewSignups: integer({ mode: 'boolean' }).notNull(),
    ...timestamps,
  },
  (t) => [index('coach_absence_coach_idx').on(t.coachUserId, t.endDate)]
)

/** コーチごとのプラン。種類ごとに1行 */
export const plan = sqliteTable(
  'plan',
  {
    id: text().primaryKey(),
    coachUserId: text()
      .notNull()
      .references(() => coachProfile.userId, { onDelete: 'cascade' }),
    kind: text({ enum: ['trial', 'single', 'monthly'] }).notNull(),
    name: text().notNull(),
    priceYen: integer().notNull(),
    description: text().notNull(),
    active: integer({ mode: 'boolean' }).notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('plan_coach_kind_idx').on(t.coachUserId, t.kind)]
)
