import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { recordPayment } from '../application/usecases/recordPayment.usecase'
import {
  createThread,
  findCoachForCheckout,
  findPurchase,
  markPurchasePaid,
  savePendingPurchase,
  threadExists,
} from '../infrastructure/repositories/purchaseRepository'

/**
 * 開発用：Stripe を通さずに支払い済みにして、スレッドを作る
 *
 * Stripe のテストキーがなくても、動画の送信や添削を手元で確かめられるようにする。
 * 本番では 404 を返す
 */
export const handleDevPurchase = async (request: Request): Promise<Response> => {
  if (!import.meta.env.DEV) {
    return new Response('Not Found', { status: 404 })
  }
  const actor = await getActor()
  if (!actor) {
    return Response.json({ message: 'ログインしてください' }, { status: 401 })
  }
  const url = new URL(request.url)
  const coach = await findCoachForCheckout(url.searchParams.get('coach') ?? '')
  const planKind = planKindSchema.safeParse(url.searchParams.get('plan') ?? 'single')
  const plan = planKind.success ? coach?.plans.find((p) => p.kind === planKind.data) : undefined
  if (!coach || !plan) {
    return Response.json({ message: 'コーチかプランが見つかりません' }, { status: 404 })
  }

  const purchaseId = crypto.randomUUID()
  await savePendingPurchase({
    id: purchaseId,
    studentUserId: actor.userId,
    coachUserId: coach.userId,
    planKind: plan.kind,
    priceYen: plan.priceYen,
    status: 'pending',
    stripeSubscriptionId: null,
  })
  await recordPayment(
    { purchaseId, stripeCustomerId: null, subscription: null, paidAt: new Date() },
    {
      findPurchase,
      markPurchasePaid,
      threadExists,
      createThread,
      generateId: () => crypto.randomUUID(),
    }
  )
  return Response.redirect(new URL('/me', request.url), 303)
}
