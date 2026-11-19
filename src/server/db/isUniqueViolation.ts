/**
 * DB の一意制約で書き込みが止められたか（D1・SQLite のエラーの文言で見分ける）。
 * drizzle はエラーを包んで投げるので、cause もたどる
 *
 * @param column 「テーブル名.列名」（例：coach_profile.slug）
 */
export const isUniqueViolation = (error: unknown, column: string): boolean => {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current instanceof Error; depth++) {
    if (current.message.includes(`UNIQUE constraint failed: ${column}`)) return true
    current = current.cause
  }
  return false
}
