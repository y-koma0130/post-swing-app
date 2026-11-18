import { PURCHASE_RULES } from '@/server/features/purchase/domain/rules'
import type { LocalDate } from '@/server/utils/localDate'
import type { CoachFeeGrant } from '../values/CoachFeeGrant'
import { calcGrantPeriod } from './calcGrantPeriod.service'

export type CoachFeeRate = Readonly<{
  rate: number
  /** 使った特典。基本の率なら null */
  grantId: string | null
}>

export type ResolveCoachFeeRate = (
  input: Readonly<{
    grants: readonly CoachFeeGrant[]
    /** 日本時間の日付 */
    on: LocalDate
    /** 始まっていない特典を、on の日から始まるものとして扱うか（申し込みを承認するとき） */
    startPending: boolean
  }>
) => CoachFeeRate

/**
 * その日にコーチに使う手数料率
 *
 * ドメインルール:
 * - 期間（両端を含む）の中で、取り消されていない特典のうち、いちばん低い率を1つだけ使う（割引は足し合わせない）
 * - 有効な特典がなければ基本の率（10%）。特典の率が基本より高ければ基本の率
 * - 始まっていない特典は使わない。ただし承認するときは、その日から始まるものとして扱う
 *   （初めての承認そのものも特典の対象）
 */
export const resolveCoachFeeRate: ResolveCoachFeeRate = ({ grants, on, startPending }) => {
  const base: CoachFeeRate = { rate: PURCHASE_RULES.platformFeeRate, grantId: null }
  return grants.reduce<CoachFeeRate>((best, grant) => {
    if (grant.revokedAt !== null) return best
    const period =
      grant.period ??
      (startPending ? calcGrantPeriod({ startDate: on, durationDays: grant.durationDays }) : null)
    if (period === null || on < period.startDate || period.endDate < on) return best
    return grant.feeRate < best.rate ? { rate: grant.feeRate, grantId: grant.id } : best
  }, base)
}
