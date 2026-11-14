import { z } from 'zod'
import { coachSlugSchema } from './CoachSlug'
import { planSchema } from './Plan'

/**
 * コーチ
 *
 * ドメインルール:
 * - 月の受付枠は1〜100
 * - プランは1つ以上、同じ種類のプランは1つまで
 */
export const coachSchema = z.object({
  slug: coachSlugSchema,
  name: z.string().min(1).max(50),
  title: z.string().max(50),
  bio: z.string().max(1000),
  instagram: z.string().max(50),
  monthlyCapacity: z.number().int().min(1).max(100),
  plans: z
    .array(planSchema)
    .min(1, 'プランは1つ以上必要です')
    .refine(
      (plans) => new Set(plans.map((p) => p.kind)).size === plans.length,
      '同じ種類のプランは1つまでです'
    ),
})

export type Coach = z.infer<typeof coachSchema>
