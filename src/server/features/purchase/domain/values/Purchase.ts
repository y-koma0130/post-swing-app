import { z } from 'zod'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'

/**
 * 申し込みの支払いの状態
 * - pending: 支払い画面に進んだが、まだ済んでいない
 * - authorized: カードを仮押さえした（お試し・1スレッド。コーチの承認を待つ）
 * - paid: 支払い済み（承認で確定した、または月額を払った）
 * - voided: 仮押さえを取り消した（コーチが断った・期限切れ）。請求はしていない
 * - canceled: 月額を解約した
 */
export const purchaseStatusSchema = z.enum(['pending', 'authorized', 'paid', 'voided', 'canceled'])

/**
 * 申し込み（Stripe Checkout 1回分）
 *
 * ドメインルール:
 * - 価格とシステム利用料は申し込んだ時点の値で固定（月額の値下げだけは、あとから反映する）
 * - お試し・1スレッドは、カードを仮押さえし、コーチが承認したら請求を確定する（断ったら取り消す）
 * - 月額は1つの申し込みから毎月スレッドができる
 */
export const purchaseSchema = z.object({
  id: z.string().min(1),
  studentUserId: z.string().min(1),
  coachUserId: z.string().min(1),
  planKind: planKindSchema,
  priceYen: z.number().int().positive(),
  /** 生徒が別に払うシステム利用料（申し込んだ時点の値。月額は毎月） */
  systemFeeYen: z.number().int().nonnegative(),
  status: purchaseStatusSchema,
  stripeSubscriptionId: z.string().nullable(),
  /** カードを仮押さえした支払い。開発用の申し込みでは null */
  stripePaymentIntentId: z.string().nullable(),
})

export type Purchase = z.infer<typeof purchaseSchema>
