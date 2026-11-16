import type { Coach } from '../values/Coach'

export type CanAcceptApplications = (coach: Pick<Coach, 'chargesEnabled' | 'plans'>) => boolean

/**
 * 受付ページで申し込みを受けられるか
 *
 * ドメインルール:
 * - Stripe で決済を受けられる
 * - 受付中のプランが1つ以上ある
 */
export const canAcceptApplications: CanAcceptApplications = (coach) =>
  coach.chargesEnabled && coach.plans.some((plan) => plan.active)
