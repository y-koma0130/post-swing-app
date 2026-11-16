/**
 * 開発サーバーで、未適用のマイグレーションを D1 に流す
 *
 * `cf d1 migrations apply` はデータベースの ID しか受け取らず、開発サーバーが使うローカルの D1 を指せない。
 * そこで開発中だけ Worker 自身が適用する。記録の表は wrangler・cf と同じ形（d1_migrations）にそろえ、
 * 本番では CI から `cf d1 migrations apply` で適用する
 */

const STATEMENT_BREAKPOINT = '--> statement-breakpoint'

const migrationFiles = import.meta.glob<string>('/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const toName = (path: string): string => path.split('/').at(-1) ?? path

const apply = async (db: D1Database): Promise<void> => {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS d1_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    )
    .run()
  const applied = await db.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()
  const appliedNames = new Set(applied.results.map((row) => row.name))

  const pending = Object.entries(migrationFiles)
    .map(([path, sql]) => ({ name: toName(path), sql }))
    .filter((m) => !appliedNames.has(m.name))
    .toSorted((a, b) => a.name.localeCompare(b.name))

  for (const migration of pending) {
    const statements = migration.sql
      .split(STATEMENT_BREAKPOINT)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    await db.batch([
      ...statements.map((s) => db.prepare(s)),
      db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(migration.name),
    ])
    console.info(`[db] マイグレーションを適用しました: ${migration.name}`)
  }
}

let running: Promise<void> | null = null

/** 最初のリクエストで1回だけ走らせる。失敗したら次のリクエストでやり直す */
export const applyDevMigrations = (db: D1Database): Promise<void> => {
  running ??= apply(db).catch((error: unknown) => {
    running = null
    throw error
  })
  return running
}
