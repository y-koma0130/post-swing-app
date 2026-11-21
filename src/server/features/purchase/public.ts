import 'server-only'
import {
  resolveFeeAt,
  resolveFeeOnApproval,
  startGrantsOnApproval,
} from '@/server/features/campaign/public'
import { isDemoCoach } from '@/server/features/demo/public'
import { logError } from '@/server/utils/logger'
import { err, type Result } from '@/server/utils/result'
import { capturePurchase } from './application/usecases/capturePurchase.usecase'
import { lowerMonthlyPrices as lowerMonthlyPricesUsecase } from './application/usecases/lowerMonthlyPrices.usecase'
import { voidPurchase } from './application/usecases/voidPurchase.usecase'
import type { Purchase } from './domain/values/Purchase'
import {
  cancelPaymentIntent,
  capturePaymentIntent,
  changeSubscriptionPrice,
  startSubscription,
} from './infrastructure/external-services/paymentIntents'
import { savePayment } from './infrastructure/repositories/paymentRepository'
import {
  findActiveSubscriptions,
  findPurchase,
  markPurchaseCaptured,
  markPurchaseVoided,
  savePurchasePrice,
} from './infrastructure/repositories/purchaseRepository'

/** カードを登録しないままの申し込みを取り消す（thread が下書きを消すときに呼ぶ） */
export { releasePendingPurchase } from './infrastructure/repositories/purchaseRepository'

/**
 * purchase がほかの feature に公開する関数（ほかの feature は、purchase の domain と、このファイルだけを使う）
 */

/**
 * Stripe を通っていない申し込みも承認・お断りできるか。
 * 開発中（開発用ルートで作ったもの）と、デモのコーチ（staging でコーチ候補が試すもの）だけ
 */
const allowWithoutStripe = async (purchase: Pick<Purchase, 'coachUserId'>): Promise<boolean> =>
  import.meta.env.DEV || isDemoCoach(purchase.coachUserId)

/** Stripe との通信の失敗は、ほかの失敗と同じく値で返す（呼ぶ側で「もう一度」を出す・翌日に回す） */
const guard = async <T, E extends string>(
  label: string,
  run: () => Promise<Result<T, E>>
): Promise<Result<T, E | 'stripe_error'>> => {
  try {
    return await run()
  } catch (error) {
    logError('stripe', `${label}に失敗しました`, error)
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
        resolveFeeOnApproval,
        capturePaymentIntent,
        startGrantsOnApproval,
        startSubscription,
        savePayment,
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
      {
        findPurchase,
        cancelPaymentIntent,
        markPurchaseVoided,
        allowWithoutStripe,
      }
    )
  )

/** コーチが月額を値下げしたら、いまの生徒にも次の請求から反映する（値上げは何もしない） */
export const lowerMonthlyPrices = (coachUserId: string, monthlyPriceYen: number) =>
  lowerMonthlyPricesUsecase(
    { coachUserId, monthlyPriceYen, now: new Date() },
    {
      findActiveSubscriptions,
      changeSubscriptionPrice: async (input) => {
        try {
          await changeSubscriptionPrice(input)
          return true
        } catch (error) {
          logError('stripe', '月額の価格を変えられませんでした', error, {
            ids: { subscriptionId: input.subscriptionId },
          })
          return false
        }
      },
      savePurchasePrice,
      resolveFeeAt,
    }
  )
