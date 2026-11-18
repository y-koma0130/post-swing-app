import 'server-only'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { campaign, coachFeeGrant } from '@/server/db/schema'
import { type Campaign, campaignSchema } from '../../domain/values/Campaign'
import {
  type CoachFeeGrant,
  coachFeeGrantSchema,
  type GrantPeriod,
} from '../../domain/values/CoachFeeGrant'

const toCampaign = (row: typeof campaign.$inferSelect): Campaign =>
  campaignSchema.parse({
    id: row.id,
    code: row.code,
    name: row.name,
    feeRate: row.feeRate,
    durationDays: row.durationDays,
    anchor: row.anchor,
    maxGrants: row.maxGrants,
    active: row.active,
  })

export const toGrant = (row: typeof coachFeeGrant.$inferSelect): CoachFeeGrant =>
  coachFeeGrantSchema.parse({
    id: row.id,
    coachUserId: row.coachUserId,
    campaignId: row.campaignId,
    feeRate: row.feeRate,
    durationDays: row.durationDays,
    period:
      row.startDate !== null && row.endDate !== null
        ? { startDate: row.startDate, endDate: row.endDate }
        : null,
    revokedAt: row.revokedAt,
  })

export type FindCampaignByCode = (code: string) => Promise<Campaign | null>
export const findCampaignByCode: FindCampaignByCode = async (code) => {
  const row = await getDb().select().from(campaign).where(eq(campaign.code, code)).get()
  return row ? toCampaign(row) : null
}

export type FindCoachGrants = (coachUserId: string) => Promise<CoachFeeGrant[]>
/** コーチに付いた特典（取り消したもの・終わったものも含む） */
export const findCoachGrants: FindCoachGrants = async (coachUserId) => {
  const rows = await getDb()
    .select()
    .from(coachFeeGrant)
    .where(eq(coachFeeGrant.coachUserId, coachUserId))
    .all()
  return rows.map(toGrant)
}

export type FindGrant = (grantId: string) => Promise<CoachFeeGrant | null>
export const findGrant: FindGrant = async (grantId) => {
  const row = await getDb().select().from(coachFeeGrant).where(eq(coachFeeGrant.id, grantId)).get()
  return row ? toGrant(row) : null
}

export type GrantExists = (coachUserId: string, campaignId: string) => Promise<boolean>
/** このコーチに、このキャンペーンの特典がすでにあるか（取り消したものも含む） */
export const grantExists: GrantExists = async (coachUserId, campaignId) => {
  const row = await getDb()
    .select({ id: coachFeeGrant.id })
    .from(coachFeeGrant)
    .where(
      and(eq(coachFeeGrant.coachUserId, coachUserId), eq(coachFeeGrant.campaignId, campaignId))
    )
    .get()
  return row !== undefined
}

export type InsertGrantWithinLimit = (
  grant: Readonly<{
    id: string
    coachUserId: string
    campaignId: string
    period: GrantPeriod | null
    createdAt: Date
  }>
) => Promise<boolean>
/**
 * 特典を付ける。キャンペーンの上限（取り消していない特典の数）に達していたら付けずに false
 *
 * 同時に付けても上限を超えないよう、数える条件を INSERT の中に入れた1つの文にする
 * （D1 は書き込みを1つずつ処理する）。率と日数は、この時点のキャンペーンの値を写す
 */
export const insertGrantWithinLimit: InsertGrantWithinLimit = async (grant) => {
  const result = await getDb().run(sql`
    INSERT INTO coach_fee_grant
      (id, coach_user_id, campaign_id, fee_rate, duration_days, start_date, end_date, revoked_at, created_at)
    SELECT ${grant.id}, ${grant.coachUserId}, c.id, c.fee_rate, c.duration_days,
      ${grant.period?.startDate ?? null}, ${grant.period?.endDate ?? null}, NULL, ${grant.createdAt.getTime()}
    FROM campaign c
    WHERE c.id = ${grant.campaignId}
      AND (
        c.max_grants IS NULL
        OR (SELECT count(*) FROM coach_fee_grant g WHERE g.campaign_id = c.id AND g.revoked_at IS NULL)
          < c.max_grants
      )
    ON CONFLICT DO NOTHING
  `)
  return result.meta.changes > 0
}

export type StartGrantPeriod = (grantId: string, period: GrantPeriod) => Promise<void>
/** 始まっていない特典を始める（すでに始まっていれば何もしない。同じ承認が2回届いても期間は動かない） */
export const startGrantPeriod: StartGrantPeriod = async (grantId, period) => {
  await getDb()
    .update(coachFeeGrant)
    .set({ startDate: period.startDate, endDate: period.endDate })
    .where(and(eq(coachFeeGrant.id, grantId), isNull(coachFeeGrant.startDate)))
}

export type SaveGrantRevoked = (grantId: string, revokedAt: Date) => Promise<void>
export const saveGrantRevoked: SaveGrantRevoked = async (grantId, revokedAt) => {
  await getDb()
    .update(coachFeeGrant)
    .set({ revokedAt })
    .where(and(eq(coachFeeGrant.id, grantId), isNull(coachFeeGrant.revokedAt)))
}

export type FindCampaignNames = (campaignIds: string[]) => Promise<Map<string, string>>
export const findCampaignNames: FindCampaignNames = async (campaignIds) => {
  if (campaignIds.length === 0) return new Map()
  const rows = await getDb()
    .select({ id: campaign.id, name: campaign.name })
    .from(campaign)
    .where(inArray(campaign.id, campaignIds))
    .all()
  return new Map(rows.map((row) => [row.id, row.name]))
}
