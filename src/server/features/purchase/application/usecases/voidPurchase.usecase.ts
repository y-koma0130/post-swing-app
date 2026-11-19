import { err, ok, type Result } from '@/server/utils/result'
import { needsPayment, type Purchase } from '../../domain/values/Purchase'

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  /** カードの仮押さえを外す（Stripe）。外せなければ false（すでに外れていれば true） */
  cancelPaymentIntent: (paymentIntentId: string) => Promise<boolean>
  markPurchaseVoided: (purchaseId: string) => Promise<void>
  /** Stripe を通っていない申し込み（開発用）でも進めてよいか。本番では false */
  allowWithoutStripe: boolean
}>

export type VoidPurchaseError = 'not_found' | 'not_authorized' | 'void_failed'

export type VoidPurchase = (
  params: Readonly<{ purchaseId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ purchaseId: string }, VoidPurchaseError>>

/**
 * 断った・期限切れの申し込みの、カードの仮押さえを外す（thread のお断り・毎日の処理から呼ぶ）
 *
 * ドメインルール:
 * - 仮押さえした申し込みだけ。取り消し済みなら何もしない
 * - 生徒には請求しない
 * - 無料のモニター（0円）は、Stripe を呼ばずに取り消す
 */
export const voidPurchase: VoidPurchase = async ({ purchaseId }, deps) => {
  const purchase = await deps.findPurchase(purchaseId)
  if (!purchase) {
    return err('not_found')
  }
  if (purchase.status === 'voided') {
    return ok({ purchaseId })
  }
  if (purchase.status !== 'authorized') {
    return err('not_authorized')
  }
  if (purchase.stripePaymentIntentId !== null) {
    if (!(await deps.cancelPaymentIntent(purchase.stripePaymentIntentId))) {
      return err('void_failed')
    }
  } else if (needsPayment(purchase) && !deps.allowWithoutStripe) {
    return err('void_failed')
  }
  await deps.markPurchaseVoided(purchase.id)
  return ok({ purchaseId })
}
