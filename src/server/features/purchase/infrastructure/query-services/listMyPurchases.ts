import 'server-only'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, purchase } from '@/server/db/schema'
import type { MyPurchaseDto } from '../../application/dto/MyPurchase.dto'

export type ListMyPurchases = (studentUserId: string) => Promise<MyPurchaseDto[]>

export const listMyPurchases: ListMyPurchases = async (studentUserId) => {
  const rows = await getDb()
    .select({
      id: purchase.id,
      coachName: coachProfile.displayName,
      coachSlug: coachProfile.slug,
      planKind: purchase.planKind,
      priceYen: purchase.priceYen,
      status: purchase.status,
      customerId: purchase.stripeCustomerId,
    })
    .from(purchase)
    .innerJoin(coachProfile, eq(coachProfile.userId, purchase.coachUserId))
    .where(and(eq(purchase.studentUserId, studentUserId), ne(purchase.status, 'pending')))
    .orderBy(desc(purchase.createdAt))
    .all()
  return rows.flatMap((row) =>
    row.status === 'pending'
      ? []
      : [
          {
            id: row.id,
            coachName: row.coachName,
            coachSlug: row.coachSlug,
            planKind: row.planKind,
            priceYen: row.priceYen,
            status: row.status,
            canManage: row.planKind === 'monthly' && row.customerId !== null,
          },
        ]
  )
}
