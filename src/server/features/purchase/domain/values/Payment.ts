import { z } from 'zod'

/** 支払いの種類。capture は承認での確定（単発・お試し、月額の初月）、invoice は月額の2か月目からの請求 */
export const paymentKindSchema = z.enum(['capture', 'invoice'])

/**
 * 実際にお金が動いた1回の記録
 *
 * ドメインルール:
 * - そのときの手数料率と、使った特典を残す（売上の画面・問い合わせ・集計はこれを見る）
 * - 同じ支払いは1回だけ記録する（id は支払いから決まる。paymentIdFor）
 * - platformFeeYen は価格に対する手数料だけ（システム利用料は含めない）
 */
export const paymentSchema = z.object({
  id: z.string().min(1),
  purchaseId: z.string().min(1),
  coachUserId: z.string().min(1),
  kind: paymentKindSchema,
  priceYen: z.number().int().positive(),
  systemFeeYen: z.number().int().nonnegative(),
  platformFeeRate: z.number().min(0).max(1),
  platformFeeYen: z.number().int().nonnegative(),
  feeGrantId: z.string().nullable(),
  /** 請求のあとで Application Fee を返金して戻した額 */
  feeAdjustedYen: z.number().int().nonnegative(),
  stripePaymentIntentId: z.string().nullable(),
  stripeInvoiceId: z.string().nullable(),
  paidAt: z.date(),
})

export type Payment = z.infer<typeof paymentSchema>

/** 支払いの記録の id。承認での確定は申し込みごとに1回、月額の請求は請求書ごとに1回 */
export const paymentIdFor = (
  key: Readonly<{ kind: 'capture'; purchaseId: string } | { kind: 'invoice'; invoiceId: string }>
): string => (key.kind === 'capture' ? `capture-${key.purchaseId}` : `invoice-${key.invoiceId}`)
