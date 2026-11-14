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
  plans: Array<{
    kind: PlanKind
    name: string
    priceYen: number
    description: string
  }>
}
