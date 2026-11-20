import 'server-only'
import type { CoachSettingsDto } from '../../application/dto/CoachSettings.dto'
import { PLAN_DISPLAY_ORDER, PLAN_MIN_PRICE_YEN } from '../../domain/rules'
import { findAvatarKey, findCoachByUserId } from '../repositories/coachRepository'
import { toAvatarUrl } from './avatarUrl'

export type FindCoachSettings = (userId: string) => Promise<CoachSettingsDto | null>

export const findCoachSettings: FindCoachSettings = async (userId) => {
  const [coach, avatarKey] = await Promise.all([findCoachByUserId(userId), findAvatarKey(userId)])
  if (!coach) {
    return null
  }
  return {
    slug: coach.slug,
    name: coach.name,
    title: coach.title,
    bio: coach.bio,
    instagram: coach.instagram,
    licenses: coach.licenses,
    licenseOther: coach.licenseOther,
    avatarUrl: toAvatarUrl(coach.slug, avatarKey),
    monthlyCapacity: coach.monthlyCapacity,
    chargesEnabled: coach.chargesEnabled,
    hasStripeAccount: coach.stripeAccountId !== null,
    plans: coach.plans
      .toSorted((a, b) => PLAN_DISPLAY_ORDER[a.kind] - PLAN_DISPLAY_ORDER[b.kind])
      .map((plan) => ({
        kind: plan.kind,
        name: plan.name,
        priceYen: plan.price,
        minPriceYen: PLAN_MIN_PRICE_YEN[plan.kind],
        active: plan.active,
      })),
  }
}
