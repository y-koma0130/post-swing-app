import { mockCoaches, mockThreads } from '@/server/mocks/fixtures'
import type { CoachProfileDto } from '../../application/dto/CoachProfile.dto'
import { calcRemainingCapacity } from '../../domain/services/calcRemainingCapacity.service'

export type FindCoachProfileBySlug = (slug: string) => Promise<CoachProfileDto | null>

/**
 * スラッグでコーチの受付ページ情報を取得
 *
 * MOC: 固定データから返す。段階1で D1 に差し替える
 */
export const findCoachProfileBySlug: FindCoachProfileBySlug = async (slug) => {
  const coach = mockCoaches.find((c) => c.slug === slug)
  if (!coach) {
    return null
  }

  const activeThreadCount = mockThreads.filter(
    (t) => t.coachSlug === coach.slug && t.status !== 'closed'
  ).length

  return {
    slug: coach.slug,
    name: coach.name,
    title: coach.title,
    bio: coach.bio,
    instagram: coach.instagram,
    remainingCapacity: calcRemainingCapacity(coach, activeThreadCount),
    plans: coach.plans.map((plan) => ({
      kind: plan.kind,
      name: plan.name,
      priceYen: plan.price,
      description: plan.description,
    })),
  }
}
