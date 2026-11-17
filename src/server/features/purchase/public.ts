import 'server-only'
import { err, type Result } from '@/server/utils/result'
import { capturePurchase } from './application/usecases/capturePurchase.usecase'
import { voidPurchase } from './application/usecases/voidPurchase.usecase'
import {
  cancelPaymentIntent,
  capturePaymentIntent,
  startSubscription,
} from './infrastructure/external-services/paymentIntents'
import {
  findPurchase,
  markPurchaseCaptured,
  markPurchaseVoided,
} from './infrastructure/repositories/purchaseRepository'

/**
 * purchase がほかの feature に公開する関数（ほかの feature は、purchase の domain と、このファイルだけを使う）
 */

/** 開発中だけ、Stripe を通っていない申し込み（開発用ルートで作ったもの）も承認・お断りできる */
const allowWithoutStripe = import.meta.env.DEV

/** Stripe との通信の失敗は、ほかの失敗と同じく値で返す（呼ぶ側で「もう一度」を出す・翌日に回す） */
const guard = async <T, E extends string>(
  label: string,
  run: () => Promise<Result<T, E>>
): Promise<Result<T, E | 'stripe_error'>> => {
  try {
    return await run()
  } catch (error) {
    console.error(`[stripe] ${label}に失敗しました`, error)
    return err('stripe_error')
  }
}

/** コーチが承認した申し込みの、仮押さえした支払いを確定する（月額はサブスクリプションも始める） */
export const capturePayment = (purchaseId: string) =>
  guard('支払いの確定', () =>
    capturePurchase(
      { purchaseId, now: new Date() },
      {
        findPurchase,
        capturePaymentIntent,
        startSubscription,
        markPurchaseCaptured,
        allowWithoutStripe,
      }
    )
  )

/** 断った・期限切れの申し込みの、カードの仮押さえを外す */
export const voidPayment = (purchaseId: string) =>
  guard('仮押さえの取り消し', () =>
    voidPurchase(
      { purchaseId },
      { findPurchase, cancelPaymentIntent, markPurchaseVoided, allowWithoutStripe }
    )
  )
