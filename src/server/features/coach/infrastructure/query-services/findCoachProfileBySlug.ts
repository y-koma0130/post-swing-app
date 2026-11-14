import 'server-only'
import { and, count, eq, ne } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, thread } from '@/server/db/schema'
import type { CoachProfileDto } from '../../application/dto/CoachProfile.dto'
import { PLAN_DISPLAY_ORDER } from '../../domain/rules'
import { calcRemainingCapacity } from '../../domain/services/calcRemainingCapacity.service'
import { canAcceptApplications } from '../../domain/services/canAcceptApplications.service'
import { coachSlugSchema } from '../../domain/values/CoachSlug'
import { findCoachByUserId } from '../repositories/coachRepository'

export type FindCoachProfileBySlug = (slug: string) => Promise<CoachProfileDto | null>

/** スラッグでコーチの受付ページ情報を取得 */
export const findCoachProfileBySlug: FindCoachProfileBySlug = async (slug) => {
  const parsed = coachSlugSchema.safeParse(slug)
  if (!parsed.success) {
    return null
  }
  const row = await getDb()
    .select({ userId: coachProfile.userId })
    .from(coachProfile)
    .where(eq(coachProfile.slug, parsed.data))
    .get()
  const coach = row ? await findCoachByUserId(row.userId) : null
  if (!coach) {
    return null
  }

  // 受付枠は、終わっていないスレッドの数で埋まる
  const active = await getDb()
    .select({ n: count() })
    .from(thread)
    .where(and(eq(thread.coachUserId, coach.userId), ne(thread.status, 'closed')))
    .get()
  const activeThreadCount = active?.n ?? 0

  return {
    slug: coach.slug,
    name: coach.name,
    title: coach.title,
    bio: coach.bio,
    instagram: coach.instagram,
    remainingCapacity: calcRemainingCapacity(coach, activeThreadCount),
    acceptingApplications: canAcceptApplications(coach),
    plans: coach.plans
      .filter((plan) => plan.active)
      .toSorted((a, b) => PLAN_DISPLAY_ORDER[a.kind] - PLAN_DISPLAY_ORDER[b.kind])
      .map((plan) => ({
        kind: plan.kind,
        name: plan.name,
        priceYen: plan.price,
        description: plan.description,
      })),
  }
}
