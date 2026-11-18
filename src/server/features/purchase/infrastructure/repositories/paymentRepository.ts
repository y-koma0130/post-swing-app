import 'server-only'
import { and, eq, gt, gte, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { payment } from '@/server/db/schema'
import { type Payment, paymentSchema } from '../../domain/values/Payment'

export type SavePayment = (input: Payment) => Promise<void>
/** 支払いを記録する。同じ id（同じ支払い）がすでにあれば何もしない */
export const savePayment: SavePayment = async (input) => {
  const value = paymentSchema.parse(input)
  await getDb()
    .insert(payment)
    .values({ ...value, createdAt: new Date() })
    .onConflictDoNothing()
}

export type FindPayment = (paymentId: string) => Promise<Payment | null>
export const findPayment: FindPayment = async (paymentId) => {
  const row = await getDb().select().from(payment).where(eq(payment.id, paymentId)).get()
  return row ? paymentSchema.parse(row) : null
}

export type MarkPaymentRefunded = (paymentId: string, refundedAt: Date) => Promise<void>
/**
 * 生徒に全額を返金したことを記録する。戻した Application Fee は、そのとき残っていた分
 * （価格の手数料＋システム利用料から、すでに差額として戻した分を引いた額）。記録がない支払い（以前のもの）は何もしない
 */
export const markPaymentRefunded: MarkPaymentRefunded = async (paymentId, refundedAt) => {
  await getDb()
    .update(payment)
    .set({
      refundedYen: sql`${payment.priceYen} + ${payment.systemFeeYen}`,
      refundedFeeYen: sql`${payment.platformFeeYen} + ${payment.systemFeeYen} - ${payment.feeAdjustedYen}`,
      refundedAt,
    })
    .where(and(eq(payment.id, paymentId), eq(payment.refundedYen, 0)))
}

export type SummarizeFeeAdjustments = (since: Date) => Promise<{ count: number; totalYen: number }>
/** ある時刻からあとに、手数料の差額を戻した件数と額（毎日の集計） */
export const summarizeFeeAdjustments: SummarizeFeeAdjustments = async (since) => {
  const row = await getDb()
    .select({
      count: sql<number>`count(*)`,
      totalYen: sql<number>`coalesce(sum(${payment.feeAdjustedYen}), 0)`,
    })
    .from(payment)
    .where(and(gt(payment.feeAdjustedYen, 0), gte(payment.createdAt, since)))
    .get()
  return { count: row?.count ?? 0, totalYen: row?.totalYen ?? 0 }
}
