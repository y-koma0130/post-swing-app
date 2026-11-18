import { decideSignupGuard } from '@/server/features/coach/domain/services/decideSignupGuard.service'
import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import { startDraftThread } from '@/server/features/thread/domain/services/startDraftThread.service'
import type { NewThread } from '@/server/features/thread/domain/values/Thread'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { PURCHASE_RULES } from '../../domain/rules'
import {
  checkPurchaseEligibility,
  type PurchaseBlocker,
} from '../../domain/services/checkPurchaseEligibility.service'
import type { Purchase } from '../../domain/values/Purchase'

/** 申し込みの判定に要るコーチの情報 */
export type CheckoutCoach = Readonly<{
  userId: string
  name: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  suspended: boolean
  monthlyCapacity: number
  plans: ReadonlyArray<{ kind: PlanKind; name: string; priceYen: number; active: boolean }>
}>

export type StartApplicationParams = Readonly<{
  actor: Actor
  coachSlug: string
  planKind: PlanKind
  /** 返信が遅れがちなとき、遅れることを了承したか */
  acknowledgedDelay: boolean
  now: Date
}>

type Dependencies = Readonly<{
  findCoachForCheckout: (slug: string) => Promise<CheckoutCoach | null>
  countActiveThreads: (coachUserId: string) => Promise<number>
  hasPaidTrial: (studentUserId: string, coachUserId: string) => Promise<boolean>
  hasActiveSubscription: (studentUserId: string, coachUserId: string) => Promise<boolean>
  findCoachAvailability: (coachUserId: string, now: Date) => Promise<CoachAvailability>
  /** このコーチへの、まだ決まっていない申し込み（thread が持つ） */
  findOpenApplication: (
    studentUserId: string,
    coachUserId: string
  ) => Promise<{ threadId: string } | null>
  savePendingPurchase: (purchase: Purchase) => Promise<void>
  /** 下書きのスレッドを作る（thread が持つ） */
  createThread: (thread: NewThread) => Promise<void>
  generateId: () => string
}>

export type StartApplicationError = 'not_found' | PurchaseBlocker

export type StartApplication = (
  params: StartApplicationParams,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, StartApplicationError>>

/**
 * 生徒がプランを選んで申し込みを始める（悩みと動画を送る下書きを作る。支払いはまだ）
 *
 * - 申し込めるかは checkPurchaseEligibility で決める
 * - このコーチへのまだ決まっていない申し込みがあれば、新しく作らずにそれを返す（1人1件）
 */
export const startApplication: StartApplication = async (
  { actor, coachSlug, planKind, acknowledgedDelay, now },
  deps
) => {
  const coach = await deps.findCoachForCheckout(coachSlug)
  if (!coach) {
    return err('not_found')
  }
  const open = await deps.findOpenApplication(actor.userId, coach.userId)
  if (open) {
    return ok({ threadId: open.threadId })
  }
  const [activeThreadCount, hasPaidTrial, hasActiveSubscription, availability] = await Promise.all([
    deps.countActiveThreads(coach.userId),
    deps.hasPaidTrial(actor.userId, coach.userId),
    deps.hasActiveSubscription(actor.userId, coach.userId),
    deps.findCoachAvailability(coach.userId, now),
  ])
  const eligibility = checkPurchaseEligibility({
    coach,
    planKind,
    studentUserId: actor.userId,
    facts: { activeThreadCount, hasPaidTrial, hasActiveSubscription },
    signupGuard: decideSignupGuard(availability),
    acknowledgedDelay,
  })
  if (!eligibility.ok) {
    return err(eligibility.error)
  }

  const purchaseId = deps.generateId()
  await deps.savePendingPurchase({
    id: purchaseId,
    studentUserId: actor.userId,
    coachUserId: coach.userId,
    planKind,
    priceYen: eligibility.value.plan.priceYen,
    systemFeeYen: PURCHASE_RULES.systemFeeYen,
    status: 'pending',
    stripeSubscriptionId: null,
    stripePaymentIntentId: null,
  })
  const thread = startDraftThread({
    id: deps.generateId(),
    purchaseId,
    coachUserId: coach.userId,
    studentUserId: actor.userId,
    planKind,
    now,
  })
  await deps.createThread(thread)
  return ok({ threadId: thread.id })
}
