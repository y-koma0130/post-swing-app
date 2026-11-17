import { decideSignupGuard } from '@/server/features/coach/domain/services/decideSignupGuard.service'
import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { calcPlatformFee } from '../../domain/services/calcPlatformFee.service'
import {
  checkPurchaseEligibility,
  type PurchaseBlocker,
} from '../../domain/services/checkPurchaseEligibility.service'
import type { Purchase } from '../../domain/values/Purchase'
import type { CheckoutCoach, CreateCheckoutSessionInput } from './startCheckout.usecase'

export type StartApplicationCheckoutParams = Readonly<{
  actor: Actor
  threadId: string
  now: Date
}>

type Dependencies = Readonly<{
  /** 申し込みのスレッドと、送った提出の数（thread が持つ） */
  findApplicationThread: (threadId: string) => Promise<{
    id: string
    purchaseId: string
    coachUserId: string
    studentUserId: string
    status: ThreadStatus
    submissionCount: number
  } | null>
  findPurchase: (purchaseId: string) => Promise<Purchase | null>
  findCoachForCheckoutByUserId: (
    coachUserId: string
  ) => Promise<(CheckoutCoach & { slug: string }) | null>
  countActiveThreads: (coachUserId: string) => Promise<number>
  hasPaidTrial: (studentUserId: string, coachUserId: string) => Promise<boolean>
  hasActiveSubscription: (studentUserId: string, coachUserId: string) => Promise<boolean>
  findCoachAvailability: (coachUserId: string, now: Date) => Promise<CoachAvailability>
  createCheckoutSession: (
    input: CreateCheckoutSessionInput
  ) => Promise<{ sessionId: string; url: string }>
  attachCheckoutSession: (purchaseId: string, sessionId: string) => Promise<void>
}>

export type StartApplicationCheckoutError =
  | 'not_found'
  | 'not_draft'
  | 'no_submission'
  | PurchaseBlocker

export type StartApplicationCheckout = (
  params: StartApplicationCheckoutParams,
  dependencies: Dependencies
) => Promise<Result<{ url: string }, StartApplicationCheckoutError>>

/**
 * 悩みと動画を送った申し込みの、カードの登録（仮押さえ）へ進む
 *
 * - 本人の下書きだけ（他人には not_found）。悩みと動画を送ってから
 * - 下書きを作ってから時間がたっているので、申し込めるかをもう一度 checkPurchaseEligibility で確かめる
 *   （返信遅れの了承は、プランを選んだときに済んでいる）
 * - 価格は、下書きを作ったときの値（申し込みに保存した値）
 */
export const startApplicationCheckout: StartApplicationCheckout = async (
  { actor, threadId, now },
  deps
) => {
  const thread = await deps.findApplicationThread(threadId)
  if (!thread || thread.studentUserId !== actor.userId) {
    return err('not_found')
  }
  if (thread.status !== 'draft') {
    return err('not_draft')
  }
  if (thread.submissionCount === 0) {
    return err('no_submission')
  }
  const [purchase, coach] = await Promise.all([
    deps.findPurchase(thread.purchaseId),
    deps.findCoachForCheckoutByUserId(thread.coachUserId),
  ])
  if (!purchase || !coach || purchase.status !== 'pending') {
    return err('not_found')
  }
  const [activeThreadCount, hasPaidTrial, hasActiveSubscription, availability] = await Promise.all([
    deps.countActiveThreads(coach.userId),
    deps.hasPaidTrial(actor.userId, coach.userId),
    deps.hasActiveSubscription(actor.userId, coach.userId),
    deps.findCoachAvailability(coach.userId, now),
  ])
  const eligibility = checkPurchaseEligibility({
    coach,
    planKind: purchase.planKind,
    studentUserId: actor.userId,
    facts: { activeThreadCount, hasPaidTrial, hasActiveSubscription },
    signupGuard: decideSignupGuard(availability),
    acknowledgedDelay: true,
  })
  if (!eligibility.ok) {
    return err(eligibility.error)
  }

  const session = await deps.createCheckoutSession({
    purchaseId: purchase.id,
    mode: 'payment',
    productName: `${coach.name}：${eligibility.value.plan.name}`,
    priceYen: purchase.priceYen,
    platformFeeYen: calcPlatformFee(purchase.priceYen),
    destinationAccountId: eligibility.value.destinationAccountId,
    coachSlug: coach.slug,
    studentUserId: actor.userId,
    application: { threadId: thread.id },
  })
  await deps.attachCheckoutSession(purchase.id, session.sessionId)
  return ok({ url: session.url })
}
