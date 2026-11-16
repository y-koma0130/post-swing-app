import { err, ok, type Result } from '@/server/utils/result'

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  saveCoachSuspended: (userId: string, suspendedAt: Date | null) => Promise<void>
}>

export type SetCoachSuspended = (
  params: Readonly<{ coachUserId: string; suspended: boolean; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<void, 'not_found'>>

/**
 * 管理者がコーチの受付を止める・再開する（管理者かどうかは呼び出し側で確かめる）
 *
 * 止めても進行中のスレッドは続く。新しい申し込みだけを受けない（canAcceptApplications・checkPurchaseEligibility）
 */
export const setCoachSuspended: SetCoachSuspended = async (
  { coachUserId, suspended, now },
  deps
) => {
  if (!(await deps.isCoach(coachUserId))) {
    return err('not_found')
  }
  await deps.saveCoachSuspended(coachUserId, suspended ? now : null)
  return ok(undefined)
}
