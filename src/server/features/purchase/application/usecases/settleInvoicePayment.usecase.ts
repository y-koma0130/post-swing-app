import { err, ok, type Result } from '@/server/utils/result'
import { calcCharge } from '../../domain/services/calcCharge.service'
import { calcFeeAdjustment } from '../../domain/services/calcFeeAdjustment.service'
import { type Payment, paymentIdFor } from '../../domain/values/Payment'
import type { Purchase } from '../../domain/values/Purchase'
import type { FeeRate } from './capturePurchase.usecase'

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  findPayment: (paymentId: string) => Promise<Payment | null>
  /** その時点のコーチの手数料率（キャンペーンの特典を含む。campaign） */
  resolveFeeAt: (coachUserId: string, at: Date) => Promise<FeeRate>
  /** 実際に取った Application Fee（Stripe）。見つからなければ null */
  findInvoiceApplicationFee: (
    invoiceId: string
  ) => Promise<{ applicationFeeId: string; amountYen: number; paymentIntentId: string } | null>
  /** Application Fee の一部をコーチへ戻す（Stripe） */
  refundApplicationFee: (
    input: Readonly<{ applicationFeeId: string; amountYen: number; idempotencyKey: string }>
  ) => Promise<void>
  savePayment: (payment: Payment) => Promise<void>
}>

export type SettleInvoicePayment = (
  params: Readonly<{
    purchaseId: string
    invoiceId: string
    /** 請求書ができた時刻（手数料の率はこの日のもの。invoice.created と同じ） */
    invoiceCreatedAt: Date
    paidAt: Date
  }>,
  dependencies: Dependencies
) => Promise<Result<{ feeAdjustedYen: number }, 'purchase_not_found'>>

/**
 * 月額の毎月の請求が支払われたら、手数料を確かめて記録する（Stripe の invoice.paid から呼ぶ）
 *
 * ドメインルール:
 * - 請求書ができた日の率で、正しい手数料を計算し直す
 * - invoice.created が届かず多く取っていたら、差額を Application Fee の返金でコーチへ戻す（calcFeeAdjustment）
 * - 同じ請求書は1回だけ記録し、1回だけ戻す（記録済みなら何もしない。返金にも冪等キー）
 */
export const settleInvoicePayment: SettleInvoicePayment = async (params, deps) => {
  const paymentId = paymentIdFor({ kind: 'invoice', invoiceId: params.invoiceId })
  const recorded = await deps.findPayment(paymentId)
  if (recorded) {
    return ok({ feeAdjustedYen: recorded.feeAdjustedYen })
  }
  const purchase = await deps.findPurchase(params.purchaseId)
  if (!purchase) {
    return err('purchase_not_found')
  }
  const fee = await deps.resolveFeeAt(purchase.coachUserId, params.invoiceCreatedAt)
  const charge = calcCharge({ ...purchase, platformFeeRate: fee.rate })
  const charged = await deps.findInvoiceApplicationFee(params.invoiceId)
  const feeAdjustedYen = charged
    ? calcFeeAdjustment({
        chargedApplicationFeeYen: charged.amountYen,
        expectedApplicationFeeYen: charge.applicationFeeYen,
      })
    : 0
  if (charged && feeAdjustedYen > 0) {
    await deps.refundApplicationFee({
      applicationFeeId: charged.applicationFeeId,
      amountYen: feeAdjustedYen,
      idempotencyKey: `fee-adjust-${params.invoiceId}`,
    })
  }
  await deps.savePayment({
    id: paymentId,
    purchaseId: purchase.id,
    coachUserId: purchase.coachUserId,
    kind: 'invoice',
    priceYen: purchase.priceYen,
    systemFeeYen: purchase.systemFeeYen,
    platformFeeRate: fee.rate,
    platformFeeYen: charge.platformFeeYen,
    feeGrantId: fee.grantId,
    feeAdjustedYen,
    stripePaymentIntentId: charged?.paymentIntentId ?? null,
    stripeInvoiceId: params.invoiceId,
    paidAt: params.paidAt,
  })
  return ok({ feeAdjustedYen })
}
