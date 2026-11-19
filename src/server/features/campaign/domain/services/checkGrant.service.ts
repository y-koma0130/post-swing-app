import type { LocalDate } from '@/server/utils/localDate'
import { err, ok, type Result } from '@/server/utils/result'
import type { Campaign } from '../values/Campaign'
import type { GrantPeriod } from '../values/CoachFeeGrant'
import { calcGrantPeriod } from './calcGrantPeriod.service'

export type GrantBlocker = 'campaign_inactive' | 'already_granted'

export type CheckGrant = (
  input: Readonly<{
    campaign: Campaign
    /** このコーチに、このキャンペーンの特典がすでにあるか（取り消したものも含む） */
    alreadyGranted: boolean
    /** このコーチが、これまでに申し込みを承認して支払いを受けたことがあるか */
    hasApprovedBefore: boolean
    today: LocalDate
  }>
) => Result<{ period: GrantPeriod | null }, GrantBlocker>

/**
 * キャンペーンの特典を付けられるか。付けられるなら、特典の期間（始まっていなければ null）
 *
 * ドメインルール:
 * - 終わったキャンペーンは付けられない
 * - 同じコーチに同じキャンペーンは1回だけ（取り消したあとも付け直さない）
 * - first_approval は始まらないまま付く。ただし、すでに承認したことがあるコーチなら付けた日から始める
 * - granted は付けた日から始める
 * - 上限は、付けるときに数える（同時に付けても超えないよう、数えるのは保存のとき）
 */
export const checkGrant: CheckGrant = ({ campaign, alreadyGranted, hasApprovedBefore, today }) => {
  if (!campaign.active) return err('campaign_inactive')
  if (alreadyGranted) return err('already_granted')
  const startsNow = campaign.anchor === 'granted' || hasApprovedBefore
  return ok({
    period: startsNow
      ? calcGrantPeriod({ startDate: today, durationDays: campaign.durationDays })
      : null,
  })
}
