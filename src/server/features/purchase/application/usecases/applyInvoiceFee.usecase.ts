import { err, ok, type Result } from '@/server/utils/result'
import { calcCharge } from '../../domain/services/calcCharge.service'
import type { Purchase } from '../../domain/values/Purchase'
import type { FeeRate } from './capturePurchase.usecase'

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  /** その時点のコーチの手数料率（キャンペーンの特典を含む。campaign） */
  resolveFeeAt: (coachUserId: string, at: Date) => Promise<FeeRate>
  /** 下書きの請求書の手数料を入れ直す（Stripe） */
  setInvoiceApplicationFee: (invoiceId: string, applicationFeeYen: number) => Promise<void>
}>

export type ApplyInvoiceFee = (
  params: Readonly<{ purchaseId: string; invoiceId: string; invoiceCreatedAt: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ applicationFeeYen: number }, 'purchase_not_found'>>

/**
 * 月額の毎月の請求書（下書き）に、その時点の手数料を入れる（Stripe の invoice.created から呼ぶ）
 *
 * ドメインルール:
 * - 率は請求書ができた日（更新日）のもの。キャンペーンの特典の始まり・終わりが、請求ごとにそのまま反映される
 * - 何度届いても同じ額を入れるだけ
 */
export const applyInvoiceFee: ApplyInvoiceFee = async (
  { purchaseId, invoiceId, invoiceCreatedAt },
  deps
) => {
  const purchase = await deps.findPurchase(purchaseId)
  if (!purchase) {
    return err('purchase_not_found')
  }
  const fee = await deps.resolveFeeAt(purchase.coachUserId, invoiceCreatedAt)
  const { applicationFeeYen } = calcCharge({ ...purchase, platformFeeRate: fee.rate })
  await deps.setInvoiceApplicationFee(invoiceId, applicationFeeYen)
  return ok({ applicationFeeYen })
}
