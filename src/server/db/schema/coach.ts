import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'
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
  monthlyCapacity: integer().notNull(),
  /** Stripe Connect の口座。口座開設前は null */
  stripeAccountId: text().unique(),
  /** Stripe で決済を受けられる状態か（account.updated で更新） */
  chargesEnabled: integer({ mode: 'boolean' }).notNull().default(false),
  /** 管理者が受付を止めた日時。止めている間は新しい申し込みを受けない（進行中のスレッドは続く） */
  suspendedAt: integer({ mode: 'timestamp_ms' }),
  ...timestamps,
})

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
