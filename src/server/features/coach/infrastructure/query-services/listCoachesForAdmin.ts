import 'server-only'
import { desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, user } from '@/server/db/schema'
import type { AdminCoachRowDto } from '../../application/dto/AdminCoachRow.dto'

export type ListCoachesForAdmin = () => Promise<AdminCoachRowDto[]>

export const listCoachesForAdmin: ListCoachesForAdmin = async () => {
  const rows = await getDb()
    .select({
      userId: coachProfile.userId,
      email: user.email,
      name: coachProfile.displayName,
      slug: coachProfile.slug,
      chargesEnabled: coachProfile.chargesEnabled,
      suspendedAt: coachProfile.suspendedAt,
      invitedAt: coachProfile.createdAt,
    })
    .from(coachProfile)
    .innerJoin(user, eq(user.id, coachProfile.userId))
    // デモのコーチは、管理画面のデモの欄に出す（ここには混ぜない）
    .where(isNull(coachProfile.demoExpiresAt))
    .orderBy(desc(coachProfile.createdAt))
    .all()
  return rows.map(({ suspendedAt, ...row }) => ({ ...row, suspended: suspendedAt !== null }))
}
