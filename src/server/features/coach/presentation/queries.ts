import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { toLocalDate } from '@/server/utils/localDate'
import type { AvailabilitySettingsDto } from '../application/dto/AvailabilitySettings.dto'
import { refreshPayoutStatus } from '../application/usecases/refreshPayoutStatus.usecase'
import { AVAILABILITY_RULES } from '../domain/rules'
import {
  calcCoachAvailability,
  delayFlagExpiresAt,
  isDelayFlagActive,
} from '../domain/services/calcCoachAvailability.service'
import { fetchChargesEnabled } from '../infrastructure/external-services/stripeConnect'
import { findCoachProfileBySlug } from '../infrastructure/query-services/findCoachProfileBySlug'
import { findCoachSettings } from '../infrastructure/query-services/findCoachSettings'
import { listCoachesForAdmin } from '../infrastructure/query-services/listCoachesForAdmin'
import {
  findStripeAccountId,
  saveChargesEnabled,
} from '../infrastructure/repositories/coachRepository'
import { findCoachAvailabilityFacts, toAvailabilityDto } from './availability'

/** 受付ページ */
export const getCoachProfile = (slug: string) => findCoachProfileBySlug(slug)

/**
 * ログイン中のコーチ
 * - ログインしていない: { kind: 'signed_out' }
 * - ログインしているがコーチではない: { kind: 'not_coach' }
 */
export const getCurrentCoach = async () => {
  const actor = await getActor()
  if (!actor) {
    return { kind: 'signed_out' } as const
  }
  const settings = await findCoachSettings(actor.userId)
  if (!settings) {
    return { kind: 'not_coach' } as const
  }
  return { kind: 'coach', actor, settings } as const
}

/** 管理画面のコーチ一覧。管理者でなければ null */
export const getCoachesForAdmin = async () => {
  if (!(await isAdminRequest())) {
    return null
  }
  return listCoachesForAdmin()
}

/** 口座の設定から戻ってきたとき、決済を受けられる状態かを Stripe に問い合わせて更新する */
export const refreshCurrentCoachPayout = async () => {
  const actor = await getActor()
  if (!actor) {
    return null
  }
  return refreshPayoutStatus(
    { userId: actor.userId },
    { findStripeAccountId, fetchChargesEnabled, saveChargesEnabled }
  )
}

/** ログイン中のコーチの「不在・返信の設定」。コーチでなければ null */
export const getCurrentCoachAvailabilitySettings =
  async (): Promise<AvailabilitySettingsDto | null> => {
    const actor = await getActor()
    if (!actor) return null
    const settings = await findCoachSettings(actor.userId)
    if (!settings) return null
    const now = new Date()
    const today = toLocalDate(now)
    const facts = await findCoachAvailabilityFacts(actor.userId)
    const flagActive = isDelayFlagActive(facts.delayFlagSetAt, now)
    return {
      availability: toAvailabilityDto(calcCoachAvailability({ ...facts, now })),
      absences: facts.absences
        .filter((a) => a.endDate >= today)
        .map((a) => ({
          id: a.id,
          startDate: a.startDate,
          endDate: a.endDate,
          note: a.note,
          pauseNewSignups: a.pauseNewSignups,
          current: a.startDate <= today,
        })),
      delayFlag: {
        active: flagActive,
        expiresAt:
          flagActive && facts.delayFlagSetAt ? delayFlagExpiresAt(facts.delayFlagSetAt) : null,
      },
      replyTargetHours: AVAILABILITY_RULES.replyTargetHours,
      noteMaxLength: AVAILABILITY_RULES.absenceNoteMaxLength,
      today,
    }
  }
