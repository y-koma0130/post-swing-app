import { PLAN_MIN_PRICE_YEN } from '../rules'
import type { Plan, PlanKind } from '../values/Plan'

export type CheckPlanPrices = (
  plans: ReadonlyArray<Pick<Plan, 'kind' | 'price'>>
) => PlanKind | null

/**
 * プランの価格が最低価格以上か。下回るプランがあれば、その種類を返す
 *
 * ドメインルール:
 * - お試し550円・1スレッド3,980円・月額3,980円以上（受付を止めているプランも同じ）
 */
export const checkPlanPrices: CheckPlanPrices = (plans) =>
  plans.find((plan) => plan.price < PLAN_MIN_PRICE_YEN[plan.kind])?.kind ?? null
