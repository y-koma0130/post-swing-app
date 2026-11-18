import 'server-only'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, purchase } from '@/server/db/schema'
import { toAvatarUrl } from '@/server/features/coach/public'
import type { MyPurchaseDto } from '../../application/dto/MyPurchase.dto'

export type ListMyPurchases = (studentUserId: string) => Promise<MyPurchaseDto[]>

export const listMyPurchases: ListMyPurchases = async (studentUserId) => {
  const rows = await getDb()
    .select({
      id: purchase.id,
      coachName: coachProfile.displayName,
      coachSlug: coachProfile.slug,
      coachAvatarKey: coachProfile.avatarR2Key,
      planKind: purchase.planKind,
      priceYen: purchase.priceYen,
      systemFeeYen: purchase.systemFeeYen,
      status: purchase.status,
      customerId: purchase.stripeCustomerId,
    })
    .from(purchase)
    .innerJoin(coachProfile, eq(coachProfile.userId, purchase.coachUserId))
    // 支払いが済んだものだけ（仮押さえ・取り消しはスレッドの一覧に出す）
    .where(
      and(eq(purchase.studentUserId, studentUserId), inArray(purchase.status, ['paid', 'canceled']))
    )
    .orderBy(desc(purchase.createdAt))
    .all()
  return rows.flatMap((row) =>
    row.status !== 'paid' && row.status !== 'canceled'
      ? []
      : [
          {
            id: row.id,
            coachName: row.coachName,
            coachSlug: row.coachSlug,
            coachAvatarUrl: toAvatarUrl(row.coachSlug, row.coachAvatarKey),
            planKind: row.planKind,
            priceYen: row.priceYen,
            systemFeeYen: row.systemFeeYen,
            status: row.status,
            canManage: row.planKind === 'monthly' && row.customerId !== null,
          },
        ]
  )
}
