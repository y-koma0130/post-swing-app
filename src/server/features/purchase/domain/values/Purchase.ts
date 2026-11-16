import { z } from 'zod'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'

export const purchaseStatusSchema = z.enum(['pending', 'paid', 'canceled'])

/**
 * 申し込み（Stripe Checkout 1回分）
 *
 * ドメインルール:
 * - 価格は申し込んだ時点の値で固定
 * - 月額は1つの申し込みから毎月スレッドができる
 */
export const purchaseSchema = z.object({
  id: z.string().min(1),
  studentUserId: z.string().min(1),
  coachUserId: z.string().min(1),
  planKind: planKindSchema,
  priceYen: z.number().int().positive(),
  status: purchaseStatusSchema,
  stripeSubscriptionId: z.string().nullable(),
})

export type Purchase = z.infer<typeof purchaseSchema>
