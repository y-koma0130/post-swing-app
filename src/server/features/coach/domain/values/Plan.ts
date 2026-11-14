import { z } from 'zod'
import { priceYenSchema } from './PriceYen'

/**
 * プランの種類
 * - trial: お試し（動画1本のミニスレッド）
 * - single: 1スレッドの都度購入
 * - monthly: 月額（毎月1スレッド）
 */
export const planKindSchema = z.enum(['trial', 'single', 'monthly'])

export type PlanKind = z.infer<typeof planKindSchema>

export const planSchema = z.object({
  kind: planKindSchema,
  name: z.string().min(1).max(30),
  price: priceYenSchema,
  description: z.string().max(200),
})

export type Plan = z.infer<typeof planSchema>
