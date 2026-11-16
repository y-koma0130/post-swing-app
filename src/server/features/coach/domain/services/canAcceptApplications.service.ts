import type { Coach } from '../values/Coach'

export type CanAcceptApplications = (
  coach: Pick<Coach, 'chargesEnabled' | 'plans' | 'suspended'>
) => boolean

/**
 * 受付ページで申し込みを受けられるか
 *
 * ドメインルール:
 * - Stripe で決済を受けられる
 * - 受付中のプランが1つ以上ある
 * - 管理者が受付を止めていない
 */
export const canAcceptApplications: CanAcceptApplications = (coach) =>
  !coach.suspended && coach.chargesEnabled && coach.plans.some((plan) => plan.active)
