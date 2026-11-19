import { toLocalDate } from '@/server/utils/localDate'
import { ok, type Result } from '@/server/utils/result'
import { calcGrantPeriod } from '../../domain/services/calcGrantPeriod.service'
import type { CoachFeeGrant, GrantPeriod } from '../../domain/values/CoachFeeGrant'

type Dependencies = Readonly<{
  findCoachGrants: (coachUserId: string) => Promise<CoachFeeGrant[]>
  /** すでに始まっていれば何もしない */
  startGrantPeriod: (grantId: string, period: GrantPeriod) => Promise<void>
}>

export type StartPendingGrants = (
  params: Readonly<{ coachUserId: string; approvedAt: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ started: number }, never>>

/**
 * コーチが申し込みを承認して支払いが確定したら、始まっていない特典を始める
 *
 * ドメインルール:
 * - 始まるのは承認した日（日本時間）。capture が成功してから呼ぶ（失敗したら始めない）
 * - 取り消した特典は始めない。2回目からの承認では、始まっている特典の期間は動かない
 */
export const startPendingGrants: StartPendingGrants = async ({ coachUserId, approvedAt }, deps) => {
  const startDate = toLocalDate(approvedAt)
  const pending = (await deps.findCoachGrants(coachUserId)).filter(
    (grant) => grant.period === null && grant.revokedAt === null
  )
  for (const grant of pending) {
    await deps.startGrantPeriod(
      grant.id,
      calcGrantPeriod({ startDate, durationDays: grant.durationDays })
    )
  }
  return ok({ started: pending.length })
}
