import { z } from 'zod'
import { localDateSchema } from '@/server/utils/localDate'
import { feeRateSchema } from './Campaign'

/** 特典の期間。日本時間の日付で、両端を含む */
export const grantPeriodSchema = z.object({
  startDate: localDateSchema,
  endDate: localDateSchema,
})

export type GrantPeriod = z.infer<typeof grantPeriodSchema>

/**
 * コーチに付いた手数料の特典
 *
 * ドメインルール:
 * - 期間（period）は始まるまで null。first_approval のキャンペーンは、初めての承認で始まる
 * - 取り消しても行は残す（revokedAt）。取り消した特典は使わず、付与の上限にも数えない
 */
export const coachFeeGrantSchema = z.object({
  id: z.string().min(1),
  coachUserId: z.string().min(1),
  campaignId: z.string().min(1),
  feeRate: feeRateSchema,
  durationDays: z.number().int().positive(),
  period: grantPeriodSchema.nullable(),
  revokedAt: z.date().nullable(),
})

export type CoachFeeGrant = z.infer<typeof coachFeeGrantSchema>
