import 'server-only'
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, monitorCode, plan, purchase, thread, user } from '@/server/db/schema'
import { localDateSchema } from '@/server/utils/localDate'
import type { MonitorCodeDto } from '../../application/dto/MonitorCode.dto'
import { MONITOR_COUNTED_PURCHASE_STATUSES } from '../../domain/rules'

export type FindSinglePrice = (coachUserId: string) => Promise<number | null>
/** コーチの1レッスンの通常価格（1レッスンのプランがなければ null） */
export const findSinglePrice: FindSinglePrice = async (coachUserId) => {
  const row = await getDb()
    .select({ priceYen: plan.priceYen })
    .from(plan)
    .where(and(eq(plan.coachUserId, coachUserId), eq(plan.kind, 'single')))
    .get()
  return row?.priceYen ?? null
}

export type CountCodeUses = (codeId: string) => Promise<number>
/** このコードで申し込んだ数（断られた・期限切れ・消えた下書きは数えない） */
export const countCodeUses: CountCodeUses = async (codeId) => {
  const row = await getDb()
    .select({ n: count() })
    .from(purchase)
    .where(
      and(
        eq(purchase.monitorCodeId, codeId),
        inArray(purchase.status, [...MONITOR_COUNTED_PURCHASE_STATUSES])
      )
    )
    .get()
  return row?.n ?? 0
}

export type HasMonitorPurchase = (studentUserId: string, coachUserId: string) => Promise<boolean>
/** この生徒が、このコーチのモニターになったことがあるか（どのコードでも） */
export const hasMonitorPurchase: HasMonitorPurchase = async (studentUserId, coachUserId) =>
  (await getDb()
    .select({ id: purchase.id })
    .from(purchase)
    .where(
      and(
        eq(purchase.studentUserId, studentUserId),
        eq(purchase.coachUserId, coachUserId),
        isNotNull(purchase.monitorCodeId),
        inArray(purchase.status, [...MONITOR_COUNTED_PURCHASE_STATUSES])
      )
    )
    .get()) !== undefined

export type ListMonitorCodes = (coachUserId: string) => Promise<MonitorCodeDto[]>
/** コーチの設定画面に出す、コードと使った生徒の一覧（新しい順） */
export const listMonitorCodes: ListMonitorCodes = async (coachUserId) => {
  const db = getDb()
  const codes = await db
    .select()
    .from(monitorCode)
    .where(eq(monitorCode.coachUserId, coachUserId))
    .orderBy(desc(monitorCode.createdAt))
  if (codes.length === 0) return []
  const uses = await db
    .select({
      codeId: purchase.monitorCodeId,
      studentName: user.name,
      threadId: thread.id,
      threadStatus: thread.status,
    })
    .from(purchase)
    .innerJoin(user, eq(user.id, purchase.studentUserId))
    .leftJoin(thread, eq(thread.purchaseId, purchase.id))
    .where(
      and(
        inArray(
          purchase.monitorCodeId,
          codes.map((c) => c.id)
        ),
        inArray(purchase.status, [...MONITOR_COUNTED_PURCHASE_STATUSES])
      )
    )
  return codes.map((c) => {
    const used = uses.filter((u) => u.codeId === c.id)
    return {
      id: c.id,
      code: c.code,
      label: c.label,
      priceYen: c.priceYen,
      maxUses: c.maxUses,
      expiresOn: c.expiresOn === null ? null : localDateSchema.parse(c.expiresOn),
      active: c.active,
      usedCount: used.length,
      monitors: used.map((u) => ({
        studentName: u.studentName,
        threadId: u.threadId,
        threadStatus: u.threadStatus,
      })),
    }
  })
}

export type FindCoachUserIdBySlug = (slug: string) => Promise<string | null>
/** 受付ページの URL のコーチ（申し込みの画面でプロモーションコードを確かめるとき） */
export const findCoachUserIdBySlug: FindCoachUserIdBySlug = async (slug) => {
  const row = await getDb()
    .select({ userId: coachProfile.userId })
    .from(coachProfile)
    .where(eq(coachProfile.slug, slug))
    .get()
  return row?.userId ?? null
}
