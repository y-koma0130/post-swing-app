import 'server-only'
import { isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile } from '@/server/db/schema'
import type { AdminCoachStatsDto } from '../../application/dto/AdminCoachStats.dto'

export type CountCoachesForAdmin = () => Promise<AdminCoachStatsDto>

/** 管理画面のコーチの数。デモのコーチ（staging でコーチ候補が試すもの）は数えない */
export const countCoachesForAdmin: CountCoachesForAdmin = async () => {
  const row = await getDb()
    .select({
      total: sql<number>`count(*)`,
      accepting: sql<number>`coalesce(sum(case when ${coachProfile.chargesEnabled} = 1 and ${coachProfile.suspendedAt} is null then 1 else 0 end), 0)`,
      payoutPending: sql<number>`coalesce(sum(case when ${coachProfile.chargesEnabled} = 0 then 1 else 0 end), 0)`,
      suspended: sql<number>`coalesce(sum(case when ${coachProfile.suspendedAt} is not null then 1 else 0 end), 0)`,
    })
    .from(coachProfile)
    .where(isNull(coachProfile.demoExpiresAt))
    .get()
  return row ?? { total: 0, accepting: 0, payoutPending: 0, suspended: 0 }
}
