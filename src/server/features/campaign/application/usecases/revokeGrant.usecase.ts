import { err, ok, type Result } from '@/server/utils/result'
import type { CoachFeeGrant } from '../../domain/values/CoachFeeGrant'

type Dependencies = Readonly<{
  findGrant: (grantId: string) => Promise<CoachFeeGrant | null>
  saveGrantRevoked: (grantId: string, revokedAt: Date) => Promise<void>
}>

export type RevokeGrant = (
  params: Readonly<{ grantId: string; now: Date }>,
  dependencies: Dependencies
) => Promise<Result<{ coachUserId: string }, 'not_found' | 'already_revoked'>>

/**
 * 特典を取り消す（管理者だけ。管理者かどうかは呼び出し側で確かめる）
 *
 * 取り消した特典は使わず、キャンペーンの上限にも数えない（枠が空く）。行は消さない
 */
export const revokeGrant: RevokeGrant = async ({ grantId, now }, deps) => {
  const grant = await deps.findGrant(grantId)
  if (!grant) {
    return err('not_found')
  }
  if (grant.revokedAt !== null) {
    return err('already_revoked')
  }
  await deps.saveGrantRevoked(grant.id, now)
  return ok({ coachUserId: grant.coachUserId })
}
