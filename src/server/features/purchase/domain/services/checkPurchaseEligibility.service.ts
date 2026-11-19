import { calcRemainingCapacity } from '@/server/features/coach/domain/services/calcRemainingCapacity.service'
import type { SignupGuard } from '@/server/features/coach/domain/services/decideSignupGuard.service'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import { err, ok, type Result } from '@/server/utils/result'

export type PurchaseBlocker =
  | 'not_accepting'
  | 'own_coach'
  | 'paused_for_absence'
  | 'ack_required'
  | 'full'
  | 'trial_used'
  | 'already_subscribed'

/** 申し込みの判定に要るコーチの情報 */
export type EligibilityCoach = Readonly<{
  userId: string
  stripeAccountId: string | null
  chargesEnabled: boolean
  suspended: boolean
  monthlyCapacity: number
  plans: ReadonlyArray<{ kind: PlanKind; name: string; priceYen: number; active: boolean }>
}>

/** 申し込む生徒とコーチの、いまの状況 */
export type PurchaseFacts = Readonly<{
  activeThreadCount: number
  hasPaidTrial: boolean
  hasActiveSubscription: boolean
}>

export type EligiblePurchase = Readonly<{
  plan: Readonly<{ name: string; priceYen: number }>
  /** 売上を送るコーチの Stripe の口座 */
  destinationAccountId: string
}>

export type CheckPurchaseEligibility = (
  input: Readonly<{
    coach: EligibilityCoach
    planKind: PlanKind
    studentUserId: string
    facts: PurchaseFacts
    /** コーチの不在・返信遅れのときの扱い（decideSignupGuard） */
    signupGuard: SignupGuard
    /** 生徒が「返信が遅れること」を了承したか */
    acknowledgedDelay: boolean
    /** モニターのプロモーションコードで申し込むか（1レッスンを受付中にしていなくても申し込める） */
    monitor?: boolean | undefined
  }>
) => Result<EligiblePurchase, PurchaseBlocker>

/**
 * 生徒がこのプランを申し込めるか
 *
 * ドメインルール:
 * - コーチが決済を受けられ、そのプランが受付中で、管理者が受付を止めていないこと
 *   （モニターは、プランを受付中にしていなくてもよい。募集はプロモーションコードで決まる）
 * - 自分自身には申し込めない
 * - コーチが不在中で新規を止めていれば申し込めない。不在・返信遅れのときは了承が要る
 * - 受付枠が残っていること（満枠ならキャンセル待ちへ）
 * - お試しは同じコーチにつき1回まで
 * - 月額は同じコーチに2重に申し込めない
 */
export const checkPurchaseEligibility: CheckPurchaseEligibility = ({
  coach,
  planKind,
  studentUserId,
  facts,
  signupGuard,
  acknowledgedDelay,
  monitor = false,
}) => {
  const plan = coach.plans.find((p) => p.kind === planKind && (p.active || monitor))
  if (!plan || coach.suspended || !coach.chargesEnabled || coach.stripeAccountId === null) {
    return err('not_accepting')
  }
  if (coach.userId === studentUserId) return err('own_coach')
  if (signupGuard === 'paused') return err('paused_for_absence')
  if (signupGuard === 'ack_required' && !acknowledgedDelay) return err('ack_required')
  if (calcRemainingCapacity(coach, facts.activeThreadCount) === 0) return err('full')
  if (planKind === 'trial' && facts.hasPaidTrial) return err('trial_used')
  if (planKind === 'monthly' && facts.hasActiveSubscription) return err('already_subscribed')
  return ok({
    plan: { name: plan.name, priceYen: plan.priceYen },
    destinationAccountId: coach.stripeAccountId,
  })
}
