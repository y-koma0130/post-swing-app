import { z } from 'zod'
import { coachLicensesSchema, licenseOtherSchema } from './CoachLicense'
import { coachSlugSchema } from './CoachSlug'
import { planSchema } from './Plan'

/**
 * コーチのプロフィール（コーチ自身が編集する部分）
 *
 * ドメインルール:
 * - 月の受付枠は1〜100
 * - 資格は選択肢から複数選べる（選択肢にないものは「その他」に書く）
 */
export const coachProfileSchema = z.object({
  slug: coachSlugSchema,
  name: z.string().trim().min(1, '名前を入れてください').max(50),
  title: z.string().trim().max(50),
  bio: z.string().trim().max(1000),
  instagram: z.string().trim().max(50),
  licenses: coachLicensesSchema,
  licenseOther: licenseOtherSchema,
  monthlyCapacity: z.number().int().min(1, '受付枠は1以上です').max(100, '受付枠は100までです'),
})

export type CoachProfile = z.infer<typeof coachProfileSchema>

/**
 * コーチ
 *
 * ドメインルール:
 * - プランは種類ごとに1つ
 * - 受付できるのは、Stripe で決済を受けられ、受付中のプランが1つ以上あり、管理者が受付を止めていないとき
 */
export const coachSchema = coachProfileSchema.extend({
  userId: z.string().min(1),
  stripeAccountId: z.string().nullable(),
  chargesEnabled: z.boolean(),
  /** 管理者が受付を止めている（規約違反の調査中など） */
  suspended: z.boolean(),
  plans: z
    .array(planSchema)
    .refine(
      (plans) => new Set(plans.map((p) => p.kind)).size === plans.length,
      '同じ種類のプランは1つまでです'
    ),
})

export type Coach = z.infer<typeof coachSchema>
