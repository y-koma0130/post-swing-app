import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { toLocalDate } from '@/server/utils/localDate'
import {
  type CoachFeeStatusDto,
  toGrantStateDto,
} from '../application/dto/CoachFeeGrantSummary.dto'
import { describeGrant } from '../domain/services/describeGrant.service'
import { resolveCoachFeeRate } from '../domain/services/resolveCoachFeeRate.service'
import { listGrantableCampaigns } from '../infrastructure/query-services/listGrantableCampaigns'
import { listGrantsForAdmin } from '../infrastructure/query-services/listGrantsForAdmin'
import {
  findCampaignNames,
  findCoachGrants,
} from '../infrastructure/repositories/campaignRepository'

/** 招待のときに選べるキャンペーン（管理者だけ） */
export const getGrantableCampaigns = async () =>
  (await isAdminRequest()) ? listGrantableCampaigns() : null

/** コーチごとの特典（管理者だけ） */
export const getGrantsForAdmin = async (coachUserIds: string[]) =>
  (await isAdminRequest()) ? listGrantsForAdmin(coachUserIds, new Date()) : null

/**
 * ログイン中のコーチの、いまの手数料。表示する特典は、使える（未開始・予定・期間中）もののうち、いちばん有利なもの
 */
export const getCurrentCoachFee = async (): Promise<CoachFeeStatusDto | null> => {
  const actor = await getActor()
  if (!actor) return null
  const grants = await findCoachGrants(actor.userId)
  const today = toLocalDate(new Date())
  const usable = grants
    .map((grant) => ({ grant, state: describeGrant({ grant, today }) }))
    .filter(({ state }) => state.kind !== 'revoked' && state.kind !== 'ended')
    .toSorted((a, b) => a.grant.feeRate - b.grant.feeRate)
  const best = usable[0]
  const names = best ? await findCampaignNames([best.grant.campaignId]) : new Map<string, string>()
  return {
    rate: resolveCoachFeeRate({ grants, on: today, startPending: false }).rate,
    grant: best
      ? {
          campaignName: names.get(best.grant.campaignId) ?? '',
          feeRate: best.grant.feeRate,
          durationDays: best.grant.durationDays,
          state: toGrantStateDto(best.state),
        }
      : null,
  }
}
