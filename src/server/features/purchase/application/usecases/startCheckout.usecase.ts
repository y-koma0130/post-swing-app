import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { calcPlatformFee } from '../../domain/services/calcPlatformFee.service'
import {
  checkPurchaseEligibility,
  type PurchaseBlocker,
} from '../../domain/services/checkPurchaseEligibility.service'
import type { Purchase } from '../../domain/values/Purchase'

export type CheckoutCoach = Readonly<{
  userId: string
  name: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  monthlyCapacity: number
  plans: ReadonlyArray<{ kind: PlanKind; name: string; priceYen: number; active: boolean }>
}>

export type CreateCheckoutSessionInput = Readonly<{
  purchaseId: string
  mode: 'payment' | 'subscription'
  productName: string
  priceYen: number
  platformFeeYen: number
  destinationAccountId: string
  coachSlug: string
  studentUserId: string
}>

export type StartCheckoutParams = Readonly<{
  actor: Actor
  coachSlug: string
  planKind: PlanKind
}>

type Dependencies = Readonly<{
  findCoachForCheckout: (slug: string) => Promise<CheckoutCoach | null>
  countActiveThreads: (coachUserId: string) => Promise<number>
  hasPaidTrial: (studentUserId: string, coachUserId: string) => Promise<boolean>
  hasActiveSubscription: (studentUserId: string, coachUserId: string) => Promise<boolean>
  savePendingPurchase: (purchase: Purchase) => Promise<void>
  createCheckoutSession: (
    input: CreateCheckoutSessionInput
  ) => Promise<{ sessionId: string; url: string }>
  attachCheckoutSession: (purchaseId: string, sessionId: string) => Promise<void>
  generateId: () => string
}>

export type StartCheckoutError = 'not_found' | PurchaseBlocker

export type StartCheckout = (
  params: StartCheckoutParams,
  dependencies: Dependencies
) => Promise<Result<{ url: string }, StartCheckoutError>>

/**
 * 生徒が申し込み、Stripe の支払い画面へ進む（申し込めるかは checkPurchaseEligibility で決める）
 */
export const startCheckout: StartCheckout = async ({ actor, coachSlug, planKind }, deps) => {
  const coach = await deps.findCoachForCheckout(coachSlug)
  if (!coach) {
    return err('not_found')
  }
  const [activeThreadCount, hasPaidTrial, hasActiveSubscription] = await Promise.all([
    deps.countActiveThreads(coach.userId),
    deps.hasPaidTrial(actor.userId, coach.userId),
    deps.hasActiveSubscription(actor.userId, coach.userId),
  ])
  const eligibility = checkPurchaseEligibility({
    coach,
    planKind,
    studentUserId: actor.userId,
    facts: { activeThreadCount, hasPaidTrial, hasActiveSubscription },
  })
  if (!eligibility.ok) {
    return err(eligibility.error)
  }
  const { plan, destinationAccountId, mode } = eligibility.value

  const purchaseId = deps.generateId()
  await deps.savePendingPurchase({
    id: purchaseId,
    studentUserId: actor.userId,
    coachUserId: coach.userId,
    planKind,
    priceYen: plan.priceYen,
    status: 'pending',
    stripeSubscriptionId: null,
  })
  const session = await deps.createCheckoutSession({
    purchaseId,
    mode,
    productName: `${coach.name}：${plan.name}`,
    priceYen: plan.priceYen,
    platformFeeYen: calcPlatformFee(plan.priceYen),
    destinationAccountId,
    coachSlug,
    studentUserId: actor.userId,
  })
  await deps.attachCheckoutSession(purchaseId, session.sessionId)
  return ok({ url: session.url })
}
