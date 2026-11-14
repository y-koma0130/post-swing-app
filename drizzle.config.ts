import { defineConfig } from 'drizzle-kit'

/** マイグレーションの SQL を作るだけに使う。適用は `cf d1 migrations apply`（package.json の db:migrate:*） */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/server/db/schema/index.ts',
  out: './migrations',
  casing: 'snake_case',
})
