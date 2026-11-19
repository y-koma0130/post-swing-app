import { z } from 'zod'
import { priceYenSchema } from './PriceYen'

/**
 * プランの種類
 * - trial: お試し（提出1回のミニスレッド）
 * - single: 1スレッドの都度購入
 * - monthly: 月額（毎月1スレッド）
 */
export const planKindSchema = z.enum(['trial', 'single', 'monthly'])

export type PlanKind = z.infer<typeof planKindSchema>

/**
 * プラン
 *
 * ドメインルール:
 * - 種類ごとに1つ。コーチは価格・説明を変えられ、受付を止める（active: false）こともできる
 */
export const planSchema = z.object({
  kind: planKindSchema,
  name: z
    .string()
    .min(1, 'プランの表示名を入れてください')
    .max(30, 'プランの表示名は30文字までです'),
  price: priceYenSchema,
  description: z.string().max(200, 'プランの説明は200文字までです'),
  active: z.boolean(),
})

export type Plan = z.infer<typeof planSchema>
