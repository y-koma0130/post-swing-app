import { z } from 'zod'
import { PURCHASE_RULES } from '@/server/features/purchase/domain/rules'

/** 手数料率（0〜基本の率）。特典で手数料が上がることはない */
export const feeRateSchema = z.number().min(0).max(PURCHASE_RULES.platformFeeRate)

/** 特典をいつから数えるか */
export const campaignAnchorSchema = z.enum(['first_approval', 'granted'])

export type CampaignAnchor = z.infer<typeof campaignAnchorSchema>

/**
 * キャンペーン（コーチの手数料の割引の定義）
 *
 * ドメインルール:
 * - 付けるときに率と日数を特典へ写す（あとでキャンペーンを変えても、付いた特典は変わらない）
 * - first_approval は、コーチが初めて申し込みを承認した日から数える。granted は付けた日から
 * - 付与の上限は、取り消していない特典の数で数える。null なら上限なし
 * - 終わったキャンペーン（active が false）は新しく付けられない
 */
export const campaignSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  feeRate: feeRateSchema,
  durationDays: z.number().int().positive(),
  anchor: campaignAnchorSchema,
  maxGrants: z.number().int().positive().nullable(),
  active: z.boolean(),
})

export type Campaign = z.infer<typeof campaignSchema>
