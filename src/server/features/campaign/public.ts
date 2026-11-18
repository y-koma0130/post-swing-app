import 'server-only'
import { toLocalDate } from '@/server/utils/localDate'
import { grantCampaign } from './application/usecases/grantCampaign.usecase'
import { startPendingGrants } from './application/usecases/startPendingGrants.usecase'
import {
  type CoachFeeRate,
  resolveCoachFeeRate,
} from './domain/services/resolveCoachFeeRate.service'
import { hasCoachBeenPaid } from './infrastructure/query-services/hasCoachBeenPaid'
import {
  findCampaignByCode,
  findCoachGrants,
  grantExists,
  insertGrantWithinLimit,
  startGrantPeriod,
} from './infrastructure/repositories/campaignRepository'

/**
 * campaign がほかの feature に公開する関数（ほかの feature は、campaign の domain と、このファイルだけを使う）
 */

/**
 * 申し込みを承認するときの手数料率。始まっていない特典は、承認した日から始まるものとして数える
 * （初めての承認そのものも特典の対象）。特典を始めるのは capture が成功してから（startGrantsOnApproval）
 */
export const resolveFeeOnApproval = async (
  coachUserId: string,
  approvedAt: Date
): Promise<CoachFeeRate> =>
  resolveCoachFeeRate({
    grants: await findCoachGrants(coachUserId),
    on: toLocalDate(approvedAt),
    startPending: true,
  })

/** 承認して支払いが確定したら、始まっていない特典を承認した日から始める */
export const startGrantsOnApproval = (coachUserId: string, approvedAt: Date) =>
  startPendingGrants({ coachUserId, approvedAt }, { findCoachGrants, startGrantPeriod })

/** その時点の手数料率（月額の請求など。始まっていない特典は使わない） */
export const resolveFeeAt = async (coachUserId: string, at: Date): Promise<CoachFeeRate> =>
  resolveCoachFeeRate({
    grants: await findCoachGrants(coachUserId),
    on: toLocalDate(at),
    startPending: false,
  })

/** コーチにキャンペーンの特典を付ける（管理者だけ。呼び出し側で確かめる） */
export const grantCampaignToCoach = (coachUserId: string, campaignCode: string) =>
  grantCampaign(
    { coachUserId, campaignCode, now: new Date() },
    {
      findCampaignByCode,
      grantExists,
      hasCoachBeenPaid,
      insertGrantWithinLimit,
      generateId: () => crypto.randomUUID(),
    }
  )
