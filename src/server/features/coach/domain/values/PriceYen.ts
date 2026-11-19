import { z } from 'zod'

/**
 * 価格（円）
 *
 * ドメインルール:
 * - 整数
 * - Stripe の最低決済額（50円）以上
 */
export const priceYenSchema = z
  .number({ error: '価格を数字で入れてください' })
  .int('価格は整数です')
  .min(50, '価格は50円以上です')
  .brand<'PriceYen'>()

export type PriceYen = z.infer<typeof priceYenSchema>
