import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * LINE 公式アカウントの友だちかどうか（Messaging API の follow・unfollow で更新）
 * 友だちでない人にはプッシュ通知を送れない
 */
export const lineFriend = sqliteTable('line_friend', {
  lineUserId: text().primaryKey(),
  isFriend: integer({ mode: 'boolean' }).notNull(),
  updatedAt: integer({ mode: 'timestamp_ms' }).notNull(),
})
