import type { PlanKind } from '../../domain/values/Plan'

/**
 * 受付ページに出すコーチ情報
 */
export type CoachProfileDto = {
  slug: string
  name: string
  title: string
  bio: string
  instagram: string
  remainingCapacity: number
  /** 申し込みを受けられるか（Stripe の口座ができていて、受付中のプランがある） */
  acceptingApplications: boolean
  /** 受付中のプランだけ */
  plans: Array<{
    kind: PlanKind
    name: string
    priceYen: number
    description: string
  }>
}
