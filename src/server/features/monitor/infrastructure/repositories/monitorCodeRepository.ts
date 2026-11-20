import 'server-only'
import { and, count, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { monitorCode } from '@/server/db/schema'
import { localDateSchema } from '@/server/utils/localDate'
import type { MonitorCode } from '../../domain/values/MonitorCode'

type Row = typeof monitorCode.$inferSelect

const toMonitorCode = (row: Row): MonitorCode => ({
  id: row.id,
  coachUserId: row.coachUserId,
  code: row.code,
  label: row.label,
  priceYen: row.priceYen,
  maxUses: row.maxUses,
  expiresOn: row.expiresOn === null ? null : localDateSchema.parse(row.expiresOn),
  active: row.active,
  createdAt: row.createdAt,
})

export type SaveMonitorCodeRow = (code: MonitorCode, updatedAt: Date) => Promise<void>
/** コードを作る・書き換える */
export const saveMonitorCodeRow: SaveMonitorCodeRow = async (code, updatedAt) => {
  const values = {
    code: code.code,
    label: code.label,
    priceYen: code.priceYen,
    maxUses: code.maxUses,
    expiresOn: code.expiresOn,
    active: code.active,
    updatedAt,
  }
  await getDb()
    .insert(monitorCode)
    .values({ ...values, id: code.id, coachUserId: code.coachUserId, createdAt: code.createdAt })
    .onConflictDoUpdate({ target: monitorCode.id, set: values })
}

export type FindMonitorCode = (codeId: string) => Promise<MonitorCode | null>
export const findMonitorCode: FindMonitorCode = async (codeId) => {
  const row = await getDb().select().from(monitorCode).where(eq(monitorCode.id, codeId)).get()
  return row ? toMonitorCode(row) : null
}

export type FindMonitorCodeByText = (
  coachUserId: string,
  code: string
) => Promise<MonitorCode | null>
/** このコーチの、この文字列のコード（ほかのコーチのコードは見つからない扱い） */
export const findMonitorCodeByText: FindMonitorCodeByText = async (coachUserId, code) => {
  const row = await getDb()
    .select()
    .from(monitorCode)
    .where(and(eq(monitorCode.coachUserId, coachUserId), eq(monitorCode.code, code)))
    .get()
  return row ? toMonitorCode(row) : null
}

export type CountActiveCodes = (coachUserId: string, exceptCodeId: string | null) => Promise<number>
export const countActiveCodes: CountActiveCodes = async (coachUserId, exceptCodeId) => {
  const row = await getDb()
    .select({ n: count() })
    .from(monitorCode)
    .where(
      and(
        eq(monitorCode.coachUserId, coachUserId),
        eq(monitorCode.active, true),
        exceptCodeId === null ? undefined : ne(monitorCode.id, exceptCodeId)
      )
    )
    .get()
  return row?.n ?? 0
}

export type CodeTaken = (code: string) => Promise<boolean>
export const codeTaken: CodeTaken = async (code) =>
  (await getDb()
    .select({ id: monitorCode.id })
    .from(monitorCode)
    .where(eq(monitorCode.code, code))
    .get()) !== undefined
