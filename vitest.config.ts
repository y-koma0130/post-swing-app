import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * ドメインとユースケースのテスト。Workers のランタイムは使わず Node で動かす
 * （依存は dependencies 引数で差し替えるので、D1 や R2 は要らない）
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
