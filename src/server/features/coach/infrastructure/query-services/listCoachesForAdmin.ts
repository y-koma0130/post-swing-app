import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, user } from '@/server/db/schema'
import type { AdminCoachRowDto } from '../../application/dto/AdminCoachRow.dto'

export type ListCoachesForAdmin = () => Promise<AdminCoachRowDto[]>

export const listCoachesForAdmin: ListCoachesForAdmin = async () =>
  getDb()
    .select({
      userId: coachProfile.userId,
      email: user.email,
      name: coachProfile.displayName,
      slug: coachProfile.slug,
      chargesEnabled: coachProfile.chargesEnabled,
      invitedAt: coachProfile.createdAt,
    })
    .from(coachProfile)
    .innerJoin(user, eq(user.id, coachProfile.userId))
    .orderBy(desc(coachProfile.createdAt))
    .all()
