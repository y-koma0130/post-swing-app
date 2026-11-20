import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getTableColumns, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { describe, expect, it } from 'vitest'
import * as schema from '@/server/db/schema'

/** デモのコーチ・生徒・レッスンにつながる列（これを持つ表は、デモを消すときに消す） */
const OWNER_COLUMNS = [
  'userId',
  'coachUserId',
  'studentUserId',
  'uploaderUserId',
  'senderUserId',
  'threadId',
  'submissionId',
  'replyId',
  'purchaseId',
]

/** つながる列があっても、デモを消すときに消さなくてよい表（理由つき） */
const NOT_DEMO_DATA: Record<string, string> = {}

const source = readFileSync(
  fileURLToPath(new URL('./demoRepository.ts', import.meta.url)),
  'utf8'
)
/** deleteDemoCoachData の中で消している表（db.delete(表) の表の名前） */
const deleted = new Set(Array.from(source.matchAll(/db\s*\.delete\((\w+)\)/g), (m) => m[1]))

const ownedTables = Object.entries(schema).flatMap(([name, table]) => {
  if (!is(table, SQLiteTable)) return []
  const columns = Object.keys(getTableColumns(table))
  return columns.some((c) => OWNER_COLUMNS.includes(c)) ? [name] : []
})

describe('デモの削除', () => {
  it('デモのコーチ・生徒・レッスンにつながる表を、すべて消す（表を足したら、削除にも足す）', () => {
    const missing = ownedTables.filter((name) => !deleted.has(name) && !(name in NOT_DEMO_DATA))
    expect(missing).toEqual([])
  })

  it('消さなくてよい表の一覧に、もうない表を残さない', () => {
    for (const name of Object.keys(NOT_DEMO_DATA)) expect(ownedTables).toContain(name)
  })
})
