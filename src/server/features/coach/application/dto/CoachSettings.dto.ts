import type { PlanKind } from '../../domain/values/Plan'

/** コーチの設定画面に出す値 */
export type CoachSettingsDto = {
  slug: string
  name: string
  title: string
  bio: string
  instagram: string
  avatarUrl: string | null
  monthlyCapacity: number
  chargesEnabled: boolean
  hasStripeAccount: boolean
  plans: Array<{
    kind: PlanKind
    name: string
    priceYen: number
    description: string
    active: boolean
  }>
}
