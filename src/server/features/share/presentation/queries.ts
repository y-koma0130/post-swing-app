import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdultAgeRange } from '@/server/features/thread/domain/values/GolfProfile'
import type { ShareConsentDto } from '../application/dto/ShareConsent.dto'
import { findCoachUserIdBySlug } from '../infrastructure/query-services/coachBySlug'
import { findLatestAgeRange } from '../infrastructure/query-services/latestAgeRange'
import { isShareConsentLocked } from '../infrastructure/query-services/monitorLock'
import { findShareConsent } from '../infrastructure/repositories/shareConsentRepository'

/**
 * ログイン中の生徒の、あるコーチへの公開の許可と、許可を選べるか（18歳以上か）、
 * 公開をやめられないか（モニターで申し込んだ）。
 * 申し込んだことのないコーチなら null
 */
export const getMyShareConsent = async (
  coachSlug: string
): Promise<{ consent: ShareConsentDto; canPublish: boolean; locked: boolean } | null> => {
  const [actor, coachUserId] = await Promise.all([getActor(), findCoachUserIdBySlug(coachSlug)])
  if (!actor || !coachUserId) return null
  const [latest, consent, locked] = await Promise.all([
    findLatestAgeRange(actor.userId, coachUserId),
    findShareConsent(coachUserId, actor.userId),
    isShareConsentLocked(actor.userId, coachUserId),
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
    locked,
  }
}
