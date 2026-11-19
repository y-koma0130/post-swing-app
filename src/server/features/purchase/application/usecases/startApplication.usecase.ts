import { decideSignupGuard } from '@/server/features/coach/domain/services/decideSignupGuard.service'
import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import type {
  MonitorCodeUse,
  ResolveMonitorCodeError,
} from '@/server/features/monitor/application/dto/MonitorCodeUse.dto'
import { startDraftThread } from '@/server/features/thread/domain/services/startDraftThread.service'
import type { NewThread } from '@/server/features/thread/domain/values/Thread'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { calcSystemFee } from '../../domain/services/calcSystemFee.service'
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
  /** モニターのプロモコード（入れていなければ null）。1レッスンだけに使える */
  monitorCode: string | null
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
  /** 生徒が入れたプロモコードを、使えるモニター価格に変える（monitor が持つ） */
  resolveMonitorCode: (input: {
    coachUserId: string
    studentUserId: string
    code: string
    now: Date
  }) => Promise<Result<MonitorCodeUse, ResolveMonitorCodeError>>
  /**
   * 申し込み途中の申し込みを作る。モニターなら、先着の人数を超えないときだけ作る
   * （同時に申し込まれても超えないように、書くときに数える）。作れなければ false
   */
  savePendingPurchase: (
    purchase: Purchase,
    monitorLimit: Readonly<{ codeId: string; maxUses: number }> | null
  ) => Promise<boolean>
  /** 下書きのスレッドを作る（thread が持つ） */
  createThread: (thread: NewThread) => Promise<void>
  generateId: () => string
}>

export type StartApplicationError =
  | 'not_found'
  | 'monitor_single_only'
  | PurchaseBlocker
  | ResolveMonitorCodeError

export type StartApplication = (
  params: StartApplicationParams,
  dependencies: Dependencies
) => Promise<Result<{ threadId: string }, StartApplicationError>>

/**
 * 生徒がプランを選んで申し込みを始める（悩みと動画を送る下書きを作る。支払いはまだ）
 *
 * - 申し込めるかは checkPurchaseEligibility で決める
 * - このコーチへのまだ決まっていない申し込みがあれば、新しく作らずにそれを返す（1人1件）
 * - プロモコードがあれば、1レッスンをモニター価格で申し込む（使えるかは monitor の resolveMonitorCode）。
 *   先着の人数は、申し込みを作るときにもう一度数える
 */
export const startApplication: StartApplication = async (
  { actor, coachSlug, planKind, acknowledgedDelay, monitorCode, now },
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
  if (monitorCode !== null && planKind !== 'single') {
    return err('monitor_single_only')
  }
  const eligibility = checkPurchaseEligibility({
    coach,
    planKind,
    studentUserId: actor.userId,
    facts: { activeThreadCount, hasPaidTrial, hasActiveSubscription },
    signupGuard: decideSignupGuard(availability),
    acknowledgedDelay,
    monitor: monitorCode !== null,
  })
  if (!eligibility.ok) {
    return err(eligibility.error)
  }
  const monitor =
    monitorCode === null
      ? null
      : await deps.resolveMonitorCode({
          coachUserId: coach.userId,
          studentUserId: actor.userId,
          code: monitorCode,
          now,
        })
  if (monitor && !monitor.ok) {
    return err(monitor.error)
  }
  const priceYen = monitor?.ok ? monitor.value.priceYen : eligibility.value.plan.priceYen

  const purchaseId = deps.generateId()
  const saved = await deps.savePendingPurchase(
    {
      id: purchaseId,
      studentUserId: actor.userId,
      coachUserId: coach.userId,
      planKind,
      priceYen,
      systemFeeYen: calcSystemFee(priceYen),
      status: 'pending',
      stripeSubscriptionId: null,
      stripePaymentIntentId: null,
      monitorCodeId: monitor?.ok ? monitor.value.codeId : null,
    },
    monitor?.ok ? { codeId: monitor.value.codeId, maxUses: monitor.value.maxUses } : null
  )
  if (!saved) {
    return err('code_full')
  }
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
