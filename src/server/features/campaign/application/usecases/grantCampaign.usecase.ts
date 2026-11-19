import { toLocalDate } from '@/server/utils/localDate'
import { err, ok, type Result } from '@/server/utils/result'
import { checkGrant, type GrantBlocker } from '../../domain/services/checkGrant.service'
import type { Campaign } from '../../domain/values/Campaign'
import type { GrantPeriod } from '../../domain/values/CoachFeeGrant'

type Dependencies = Readonly<{
  findCampaignByCode: (code: string) => Promise<Campaign | null>
  grantExists: (coachUserId: string, campaignId: string) => Promise<boolean>
  hasCoachBeenPaid: (coachUserId: string) => Promise<boolean>
  /** 上限に達していたら付けずに false（数えるのは保存のとき） */
  insertGrantWithinLimit: (
    grant: Readonly<{
      id: string
      coachUserId: string
      campaignId: string
      period: GrantPeriod | null
      createdAt: Date
    }>
  ) => Promise<boolean>
  generateId: () => string
}>

export type GrantCampaignError = 'campaign_not_found' | GrantBlocker | 'limit_reached'

export type GrantCampaign = (
  params: Readonly<{ coachUserId: string; campaignCode: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ grantId: string }, GrantCampaignError>>

/**
 * コーチにキャンペーンの特典を付ける（管理者だけ。管理者かどうかは呼び出し側で確かめる）
 */
export const grantCampaign: GrantCampaign = async ({ coachUserId, campaignCode, now }, deps) => {
  const campaign = await deps.findCampaignByCode(campaignCode)
  if (!campaign) {
    return err('campaign_not_found')
  }
  const [alreadyGranted, hasApprovedBefore] = await Promise.all([
    deps.grantExists(coachUserId, campaign.id),
    deps.hasCoachBeenPaid(coachUserId),
  ])
  const checked = checkGrant({
    campaign,
    alreadyGranted,
    hasApprovedBefore,
    today: toLocalDate(now),
  })
  if (!checked.ok) {
    return err(checked.error)
  }
  const grantId = deps.generateId()
  const inserted = await deps.insertGrantWithinLimit({
    id: grantId,
    coachUserId,
    campaignId: campaign.id,
    period: checked.value.period,
    createdAt: now,
  })
  if (!inserted) {
    return err('limit_reached')
  }
  return ok({ grantId })
}
