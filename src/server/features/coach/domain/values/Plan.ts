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
 * - 種類ごとに1つ。コーチは表示名・価格を変えられ、受付を止める（active: false）こともできる
 * - 中身（提出回数・チャット通数・期間）は種類ごとに決まっていて、コーチは変えられない。
 *   説明は書かせず、決まった中身から作る（書いた説明と実際の回数が食い違わないように）
 */
export const planSchema = z.object({
  kind: planKindSchema,
  name: z
    .string()
    .min(1, 'プランの表示名を入れてください')
    .max(30, 'プランの表示名は30文字までです'),
  price: priceYenSchema,
  active: z.boolean(),
})

export type Plan = z.infer<typeof planSchema>
