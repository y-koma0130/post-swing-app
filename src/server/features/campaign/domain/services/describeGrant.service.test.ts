import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { describeGrant } from './describeGrant.service'

const d = localDateSchema.parse
const period = { startDate: d('2026-11-01'), endDate: d('2027-01-29') }

describe('describeGrant', () => {
  it('状態を見分ける', () => {
    const at = (today: string, grant: Parameters<typeof describeGrant>[0]['grant']) =>
      describeGrant({ grant, today: d(today) })
    expect(at('2026-11-10', { period: null, revokedAt: null })).toEqual({ kind: 'pending' })
    expect(at('2026-10-31', { period, revokedAt: null })).toEqual({
      kind: 'scheduled',
      startDate: '2026-11-01',
    })
    expect(at('2027-01-29', { period, revokedAt: null })).toEqual({
      kind: 'active',
      endDate: '2027-01-29',
    })
    expect(at('2027-01-30', { period, revokedAt: null })).toEqual({
      kind: 'ended',
      endDate: '2027-01-29',
    })
    expect(at('2026-11-10', { period, revokedAt: new Date() })).toEqual({ kind: 'revoked' })
  })
})
