import 'server-only'
import { and, count, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { coachProfile, thread } from '@/server/db/schema'
import { CAPACITY_COUNTED_STATUSES } from '@/server/features/thread/domain/rules'
import type { CoachProfileDto } from '../../application/dto/CoachProfile.dto'
import { PLAN_DISPLAY_ORDER } from '../../domain/rules'
import { calcCoachAvailability } from '../../domain/services/calcCoachAvailability.service'
import { calcRemainingCapacity } from '../../domain/services/calcRemainingCapacity.service'
import { canAcceptApplications } from '../../domain/services/canAcceptApplications.service'
import { decideSignupGuard } from '../../domain/services/decideSignupGuard.service'
import { coachSlugSchema } from '../../domain/values/CoachSlug'
import { findCoachByUserId } from '../repositories/coachRepository'
import {
  findCoachAvailabilityFacts,
  toAvailabilityDto,
  toUpcomingAbsenceDto,
} from './coachAvailability'

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
    .where(
      and(
        eq(thread.coachUserId, coach.userId),
        inArray(thread.status, [...CAPACITY_COUNTED_STATUSES])
      )
    )
    .get()
  const activeThreadCount = active?.n ?? 0
  const now = new Date()
  const facts = await findCoachAvailabilityFacts(coach.userId)
  const availability = calcCoachAvailability({ ...facts, now })

  return {
    slug: coach.slug,
    name: coach.name,
    title: coach.title,
    bio: coach.bio,
    instagram: coach.instagram,
    remainingCapacity: calcRemainingCapacity(coach, activeThreadCount),
    acceptingApplications: canAcceptApplications(coach),
    availability: toAvailabilityDto(availability),
    upcomingAbsence: toUpcomingAbsenceDto(facts, now),
    signupGuard: decideSignupGuard(availability),
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
