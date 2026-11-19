import 'server-only'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { purchase } from '@/server/db/schema'

export type IsShareConsentLocked = (studentUserId: string, coachUserId: string) => Promise<boolean>
/**
 * この生徒が、このコーチにモニター（プロモーションコード）で申し込んだか。
 * 承認待ち・支払い済みのものだけ数える（断られた・期限切れ・下書きのまま消えたものは、割引を使っていない）
 */
export const isShareConsentLocked: IsShareConsentLocked = async (studentUserId, coachUserId) => {
  const row = await getDb()
    .select({ id: purchase.id })
    .from(purchase)
    .where(
      and(
        eq(purchase.studentUserId, studentUserId),
        eq(purchase.coachUserId, coachUserId),
        isNotNull(purchase.monitorCodeId),
        inArray(purchase.status, ['authorized', 'paid'])
      )
    )
    .get()
  return row !== undefined
}
