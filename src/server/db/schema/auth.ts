import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Better Auth が使う表。列名は Better Auth の決まりに合わせる
 * 生徒（LINE）もコーチ（メール）も user にまとめる。コーチかどうかは coach_profile の有無で決まる
 */

const timestamps = {
  createdAt: integer({ mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
}

export const user = sqliteTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  // LINE ではメールアドレスを取らないので、生徒には届かない仮のアドレスが入る（auth.ts）
  email: text().notNull().unique(),
  emailVerified: integer({ mode: 'boolean' }).notNull().default(false),
  image: text(),
  ...timestamps,
})

export const session = sqliteTable(
  'session',
  {
    id: text().primaryKey(),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('session_user_id_idx').on(t.userId)]
)

export const account = sqliteTable(
  'account',
  {
    id: text().primaryKey(),
    // LINE のユーザーID（通知の送り先）はここに入る
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: integer({ mode: 'timestamp_ms' }),
    refreshTokenExpiresAt: integer({ mode: 'timestamp_ms' }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index('account_user_id_idx').on(t.userId)]
)

export const verification = sqliteTable(
  'verification',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: integer({ mode: 'timestamp_ms' }).notNull(),
    ...timestamps,
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)]
)

/** Better Auth の回数制限の記録。Worker はメモリを共有しないので D1 に置く */
export const rateLimit = sqliteTable('rate_limit', {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: integer().notNull(),
})
