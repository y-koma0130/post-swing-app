import { describe, expect, it, vi } from 'vitest'
import type { CoachFeeGrant } from '../../domain/values/CoachFeeGrant'
import { revokeGrant } from './revokeGrant.usecase'

type Deps = Parameters<typeof revokeGrant>[1]

const grant: CoachFeeGrant = {
  id: 'g1',
  coachUserId: 'c1',
  campaignId: 'k1',
  feeRate: 0,
  durationDays: 90,
  period: null,
  revokedAt: null,
}

const now = new Date('2026-11-20T00:00:00Z')

const setup = (found: CoachFeeGrant | null) => {
  const saveGrantRevoked = vi.fn<Deps['saveGrantRevoked']>(async () => undefined)
  const deps: Deps = { findGrant: async () => found, saveGrantRevoked }
  return { deps, saveGrantRevoked }
}

describe('revokeGrant', () => {
  it('取り消した日時を残す', async () => {
    const { deps, saveGrantRevoked } = setup(grant)
    expect(await revokeGrant({ grantId: 'g1', now }, deps)).toEqual({
      ok: true,
      value: { coachUserId: 'c1' },
    })
    expect(saveGrantRevoked).toHaveBeenCalledWith('g1', now)
  })

  it('取り消し済み・ない特典は何もしない', async () => {
    const revoked = setup({ ...grant, revokedAt: now })
    expect(await revokeGrant({ grantId: 'g1', now }, revoked.deps)).toEqual({
      ok: false,
      error: 'already_revoked',
    })
    expect(revoked.saveGrantRevoked).not.toHaveBeenCalled()
    expect(await revokeGrant({ grantId: 'g1', now }, setup(null).deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
