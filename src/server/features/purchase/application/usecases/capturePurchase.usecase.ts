import { err, ok, type Result } from '@/server/utils/result'
import type { Purchase } from '../../domain/values/Purchase'

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  /** 仮押さえした支払いを確定する（Stripe）。カードの問題などで確定できなければ false */
  capturePaymentIntent: (paymentIntentId: string, idempotencyKey: string) => Promise<boolean>
  /** 支払い済みにする（Stripe の ID は仮押さえのときに保存済み） */
  markPurchaseCaptured: (purchaseId: string) => Promise<void>
  /** Stripe を通っていない申し込み（開発用）でも進めてよいか。本番では false */
  allowWithoutStripe: boolean
}>

export type CapturePurchaseError = 'not_found' | 'not_authorized' | 'capture_failed'

export type CapturePurchase = (
  params: Readonly<{ purchaseId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ purchaseId: string }, CapturePurchaseError>>

/**
 * コーチが承認した申し込みの、仮押さえした支払いを確定する（thread の承認から呼ぶ）
 *
 * ドメインルール:
 * - 仮押さえした申し込みだけ。確定済みなら何もしない（同じ承認を2回送っても1回だけ請求する）
 */
export const capturePurchase: CapturePurchase = async ({ purchaseId }, deps) => {
  const purchase = await deps.findPurchase(purchaseId)
  if (!purchase) {
    return err('not_found')
  }
  if (purchase.status === 'paid') {
    return ok({ purchaseId })
  }
  if (purchase.status !== 'authorized') {
    return err('not_authorized')
  }
  if (purchase.stripePaymentIntentId !== null) {
    const captured = await deps.capturePaymentIntent(
      purchase.stripePaymentIntentId,
      `capture-${purchase.id}`
    )
    if (!captured) {
      return err('capture_failed')
    }
  } else if (!deps.allowWithoutStripe) {
    return err('capture_failed')
  }
  await deps.markPurchaseCaptured(purchase.id)
  return ok({ purchaseId })
}
