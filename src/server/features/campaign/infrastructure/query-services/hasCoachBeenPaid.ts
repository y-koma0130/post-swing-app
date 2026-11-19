import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { purchase } from '@/server/db/schema'

export type HasCoachBeenPaid = (coachUserId: string) => Promise<boolean>
/**
 * このコーチが、申し込みを承認して支払いを受けたことがあるか（purchase の表を読むだけ）。
 * 解約した月額（canceled）も、一度は支払われている
 */
export const hasCoachBeenPaid: HasCoachBeenPaid = async (coachUserId) => {
  const row = await getDb()
    .select({ id: purchase.id })
    .from(purchase)
    .where(
      and(eq(purchase.coachUserId, coachUserId), inArray(purchase.status, ['paid', 'canceled']))
    )
    .get()
  return row !== undefined
}
