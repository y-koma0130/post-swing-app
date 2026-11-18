import 'server-only'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { campaign, coachFeeGrant } from '@/server/db/schema'
import { toLocalDate } from '@/server/utils/localDate'
import {
  type CoachFeeGrantSummaryDto,
  toGrantStateDto,
} from '../../application/dto/CoachFeeGrantSummary.dto'
import { describeGrant } from '../../domain/services/describeGrant.service'
import { toGrant } from '../repositories/campaignRepository'

export type ListGrantsForAdmin = (
  coachUserIds: string[],
  now: Date
) => Promise<Map<string, CoachFeeGrantSummaryDto[]>>
/** コーチごとの特典（管理画面の一覧用） */
export const listGrantsForAdmin: ListGrantsForAdmin = async (coachUserIds, now) => {
  const map = new Map<string, CoachFeeGrantSummaryDto[]>()
  if (coachUserIds.length === 0) return map
  const rows = await getDb()
    .select({ grant: coachFeeGrant, campaignName: campaign.name })
    .from(coachFeeGrant)
    .innerJoin(campaign, eq(campaign.id, coachFeeGrant.campaignId))
    .where(inArray(coachFeeGrant.coachUserId, coachUserIds))
    .orderBy(asc(coachFeeGrant.createdAt))
    .all()
  const today = toLocalDate(now)
  for (const row of rows) {
    const grant = toGrant(row.grant)
    const list = map.get(grant.coachUserId) ?? []
    list.push({
      grantId: grant.id,
      campaignName: row.campaignName,
      feeRate: grant.feeRate,
      durationDays: grant.durationDays,
      state: toGrantStateDto(describeGrant({ grant, today })),
    })
    map.set(grant.coachUserId, list)
  }
  return map
}
