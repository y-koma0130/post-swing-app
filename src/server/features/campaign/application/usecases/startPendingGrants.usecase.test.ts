import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { CoachFeeGrant } from '../../domain/values/CoachFeeGrant'
import { startPendingGrants } from './startPendingGrants.usecase'

type Deps = Parameters<typeof startPendingGrants>[1]

const grant = (overrides: Partial<CoachFeeGrant>): CoachFeeGrant => ({
  id: 'g1',
  coachUserId: 'c1',
  campaignId: 'k1',
  feeRate: 0,
  durationDays: 90,
  period: null,
  revokedAt: null,
  ...overrides,
})

const setup = (grants: CoachFeeGrant[]) => {
  const startGrantPeriod = vi.fn<Deps['startGrantPeriod']>(async () => undefined)
  const deps: Deps = { findCoachGrants: async () => grants, startGrantPeriod }
  return { deps, startGrantPeriod }
}

describe('startPendingGrants', () => {
  it('始まっていない特典を、承認した日（日本時間）から始める', async () => {
    const { deps, startGrantPeriod } = setup([grant({})])
    // 日本時間 2026-11-21 00:30（UTC ではまだ20日）
    await startPendingGrants(
      { coachUserId: 'c1', approvedAt: new Date('2026-11-20T15:30:00Z') },
      deps
    )
    expect(startGrantPeriod).toHaveBeenCalledWith('g1', {
      startDate: '2026-11-21',
      endDate: '2027-02-18',
    })
  })

  it('始まっている特典と、取り消した特典は動かさない', async () => {
    const started = grant({
      id: 'started',
      period: {
        startDate: localDateSchema.parse('2026-11-01'),
        endDate: localDateSchema.parse('2027-01-29'),
      },
    })
    const revoked = grant({ id: 'revoked', revokedAt: new Date() })
    const { deps, startGrantPeriod } = setup([started, revoked])
    expect(await startPendingGrants({ coachUserId: 'c1', approvedAt: new Date() }, deps)).toEqual({
      ok: true,
      value: { started: 0 },
    })
    expect(startGrantPeriod).not.toHaveBeenCalled()
  })
})
