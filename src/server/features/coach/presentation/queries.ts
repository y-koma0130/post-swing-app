import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { refreshPayoutStatus } from '../application/usecases/refreshPayoutStatus.usecase'
import { fetchChargesEnabled } from '../infrastructure/external-services/stripeConnect'
import { findCoachProfileBySlug } from '../infrastructure/query-services/findCoachProfileBySlug'
import { findCoachSettings } from '../infrastructure/query-services/findCoachSettings'
import { listCoachesForAdmin } from '../infrastructure/query-services/listCoachesForAdmin'
import {
  findStripeAccountId,
  saveChargesEnabled,
} from '../infrastructure/repositories/coachRepository'

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
