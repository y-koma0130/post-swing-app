import { err, ok, type Result } from '@/server/utils/result'
import type { Purchase } from '../../domain/values/Purchase'

export type RecordAuthorizationParams = Readonly<{
  purchaseId: string
  paymentIntentId: string
  stripeCustomerId: string | null
  now: Date
}>

type Dependencies = Readonly<{
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  markPurchaseAuthorized: (
    purchaseId: string,
    payment: { stripePaymentIntentId: string; stripeCustomerId: string | null }
  ) => Promise<void>
  markPurchaseVoided: (purchaseId: string) => Promise<void>
  /** 申し込みのスレッドを承認待ちにして、コーチに知らせる（thread が持つ） */
  requestApproval: (input: { purchaseId: string; now: Date }) => Promise<Result<unknown, string>>
  /** カードの仮押さえを外す（Stripe） */
  cancelPaymentIntent: (paymentIntentId: string) => Promise<boolean>
}>

export type RecordAuthorization = (
  params: RecordAuthorizationParams,
  dependencies: Dependencies
) => Promise<Result<{ outcome: 'requested' | 'released' }, 'purchase_not_found' | 'release_failed'>>

/**
 * カードの仮押さえが済んだ（Stripe の Webhook から呼ぶ）。申し込みをコーチの承認待ちにする
 *
 * ドメインルール:
 * - 同じ通知が何度届いても、承認待ちは1つ
 * - 同じ申し込みで別の支払い画面からも仮押さえされたら（戻って押し直したなど）、あとのほうは外す
 * - 下書きが消えていた（時間切れ）・悩みと動画がないときは、仮押さえを外して申し込みを取り消す
 */
export const recordAuthorization: RecordAuthorization = async (params, deps) => {
  const purchase = await deps.findPurchase(params.purchaseId)
  if (!purchase) {
    return err('purchase_not_found')
  }
  const release = async (): Promise<Result<{ outcome: 'released' }, 'release_failed'>> =>
    (await deps.cancelPaymentIntent(params.paymentIntentId))
      ? ok({ outcome: 'released' })
      : err('release_failed')

  const samePayment = purchase.stripePaymentIntentId === params.paymentIntentId
  if (purchase.status === 'pending') {
    await deps.markPurchaseAuthorized(purchase.id, {
      stripePaymentIntentId: params.paymentIntentId,
      stripeCustomerId: params.stripeCustomerId,
    })
  } else if (!(purchase.status === 'authorized' && samePayment)) {
    return release()
  }

  const requested = await deps.requestApproval({ purchaseId: purchase.id, now: params.now })
  if (requested.ok) {
    return ok({ outcome: 'requested' })
  }
  const released = await release()
  if (released.ok) {
    await deps.markPurchaseVoided(purchase.id)
  }
  return released
}
