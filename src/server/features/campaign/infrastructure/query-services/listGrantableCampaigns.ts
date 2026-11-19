import 'server-only'
import { and, asc, count, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { campaign, coachFeeGrant } from '@/server/db/schema'
import type { GrantableCampaignDto } from '../../application/dto/CoachFeeGrantSummary.dto'

export type ListGrantableCampaigns = () => Promise<GrantableCampaignDto[]>
/** 新しく付けられるキャンペーンと、残りの枠（取り消した特典は数えない） */
export const listGrantableCampaigns: ListGrantableCampaigns = async () => {
  const rows = await getDb()
    .select({
      code: campaign.code,
      name: campaign.name,
      maxGrants: campaign.maxGrants,
      used: count(coachFeeGrant.id),
    })
    .from(campaign)
    .leftJoin(
      coachFeeGrant,
      and(eq(coachFeeGrant.campaignId, campaign.id), isNull(coachFeeGrant.revokedAt))
    )
    .where(eq(campaign.active, true))
    .groupBy(campaign.id)
    .orderBy(asc(campaign.createdAt))
    .all()
  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    remaining: row.maxGrants === null ? null : Math.max(0, row.maxGrants - row.used),
  }))
}
