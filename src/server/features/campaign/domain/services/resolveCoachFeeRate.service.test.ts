import { describe, expect, it } from 'vitest'
import { type LocalDate, localDateSchema } from '@/server/utils/localDate'
import type { CoachFeeGrant } from '../values/CoachFeeGrant'
import { resolveCoachFeeRate } from './resolveCoachFeeRate.service'

const d = (value: string): LocalDate => localDateSchema.parse(value)

const grant = (overrides: Partial<CoachFeeGrant> = {}): CoachFeeGrant => ({
  id: 'g1',
  coachUserId: 'c1',
  campaignId: 'k1',
  feeRate: 0,
  durationDays: 90,
  period: { startDate: d('2026-11-01'), endDate: d('2027-01-29') },
  revokedAt: null,
  ...overrides,
})

const resolve = (grants: CoachFeeGrant[], on: string, startPending = false) =>
  resolveCoachFeeRate({ grants, on: d(on), startPending })

describe('resolveCoachFeeRate', () => {
  it('特典がなければ基本の10%', () => {
    expect(resolve([], '2026-11-10')).toEqual({ rate: 0.1, grantId: null })
  })

  it('期間の初日と最終日は特典の率、前日と翌日は基本の率（両端を含む）', () => {
    expect(resolve([grant()], '2026-10-31')).toEqual({ rate: 0.1, grantId: null })
    expect(resolve([grant()], '2026-11-01')).toEqual({ rate: 0, grantId: 'g1' })
    expect(resolve([grant()], '2027-01-29')).toEqual({ rate: 0, grantId: 'g1' })
    expect(resolve([grant()], '2027-01-30')).toEqual({ rate: 0.1, grantId: null })
  })

  it('取り消した特典は使わない', () => {
    expect(resolve([grant({ revokedAt: new Date() })], '2026-11-10').rate).toBe(0.1)
  })

  it('始まっていない特典は使わない。承認するときは、その日から始まるものとして使う', () => {
    const pending = grant({ period: null })
    expect(resolve([pending], '2026-11-10')).toEqual({ rate: 0.1, grantId: null })
    expect(resolve([pending], '2026-11-10', true)).toEqual({ rate: 0, grantId: 'g1' })
  })

  it('重なったら、いちばん低い率を1つだけ使う', () => {
    const half = grant({ id: 'half', feeRate: 0.05 })
    const free = grant({ id: 'free', feeRate: 0 })
    expect(resolve([half, free], '2026-11-10')).toEqual({ rate: 0, grantId: 'free' })
    expect(resolve([free, half], '2026-11-10')).toEqual({ rate: 0, grantId: 'free' })
  })

  it('基本と同じ率の特典では、特典を使ったことにしない', () => {
    expect(resolve([grant({ feeRate: 0.1 })], '2026-11-10')).toEqual({ rate: 0.1, grantId: null })
  })
})
