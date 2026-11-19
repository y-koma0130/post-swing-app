import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdultAgeRange } from '@/server/features/thread/domain/values/GolfProfile'
import type { ShareConsentDto } from '../application/dto/ShareConsent.dto'
import { findCoachUserIdBySlug } from '../infrastructure/query-services/coachBySlug'
import { findLatestAgeRange } from '../infrastructure/query-services/latestAgeRange'
import { findShareConsent } from '../infrastructure/repositories/shareConsentRepository'

/**
 * ログイン中の生徒の、あるコーチへの公開の許可と、許可を選べるか（18歳以上か）。
 * 申し込んだことのないコーチなら null
 */
export const getMyShareConsent = async (
  coachSlug: string
): Promise<{ consent: ShareConsentDto; canPublish: boolean } | null> => {
  const [actor, coachUserId] = await Promise.all([getActor(), findCoachUserIdBySlug(coachSlug)])
  if (!actor || !coachUserId) return null
  const [latest, consent] = await Promise.all([
    findLatestAgeRange(actor.userId, coachUserId),
    findShareConsent(coachUserId, actor.userId),
  ])
  if (!latest) return null
  return {
    consent: consent && {
      allowPublish: consent.allowPublish,
      showFace: consent.showFace,
      showAgeRange: consent.showAgeRange,
      showScore: consent.showScore,
      updatedAt: consent.updatedAt,
    },
    canPublish: isAdultAgeRange(latest.ageRange),
  }
}
