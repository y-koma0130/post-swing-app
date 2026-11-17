import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { notify } from '@/server/features/notification/public'
import { startDraftThread } from '@/server/features/thread/domain/services/startDraftThread.service'
import {
  createThread,
  findApplicationThread,
  requestThreadApproval,
  threadExists,
} from '@/server/features/thread/public'
import { recordPayment } from '../application/usecases/recordPayment.usecase'
import {
  findCoachForCheckout,
  findPurchase,
  markPurchaseAuthorized,
  markPurchasePaid,
  savePendingPurchase,
} from '../infrastructure/repositories/purchaseRepository'

/**
 * 開発用：Stripe を通さずに申し込みを進める。本番では 404 を返す
 *
 * - `?coach=<slug>&plan=trial|single`：申し込みの下書きを作り、悩みと動画を送る画面へ
 * - `?thread=<threadId>`：悩みと動画を送った下書きを、カードを仮押さえした扱いにしてコーチの承認待ちへ
 * - `?coach=<slug>&plan=monthly`：支払い済みにしてスレッドを作る（月額はまだ承認制でない）
 *
 * Stripe のテストキーがなくても、申し込み・承認・添削を手元で確かめられるようにする
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
  const threadId = url.searchParams.get('thread')
  if (threadId) {
    const thread = await findApplicationThread(threadId)
    if (!thread || thread.studentUserId !== actor.userId || thread.status !== 'draft') {
      return Response.json({ message: '下書きの申し込みが見つかりません' }, { status: 404 })
    }
    if (thread.submissionCount === 0) {
      return Response.json({ message: '先に悩みと動画を送ってください' }, { status: 400 })
    }
    await markPurchaseAuthorized(thread.purchaseId, {
      stripePaymentIntentId: null,
      stripeCustomerId: null,
    })
    await requestThreadApproval({ purchaseId: thread.purchaseId, now: new Date() })
    return Response.redirect(new URL(`/t/${thread.id}?applied=1`, request.url), 303)
  }

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
    stripePaymentIntentId: null,
  })
  if (plan.kind !== 'monthly') {
    const draft = startDraftThread({
      id: crypto.randomUUID(),
      purchaseId,
      coachUserId: coach.userId,
      studentUserId: actor.userId,
      planKind: plan.kind,
      now: new Date(),
    })
    await createThread(draft)
    return Response.redirect(new URL(`/t/${draft.id}`, request.url), 303)
  }
  await recordPayment(
    { purchaseId, stripeCustomerId: null, subscription: null, paidAt: new Date() },
    {
      findPurchase,
      markPurchasePaid,
      threadExists,
      createThread,
      notifyThreadStarted: (input) => notify({ kind: 'thread_started', ...input }),
      generateId: () => crypto.randomUUID(),
    }
  )
  return Response.redirect(new URL('/me', request.url), 303)
}
