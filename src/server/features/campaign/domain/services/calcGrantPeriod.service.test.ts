import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { calcGrantPeriod } from './calcGrantPeriod.service'

describe('calcGrantPeriod', () => {
  it('始まる日を1日目として90日間。最終日は89日後', () => {
    expect(
      calcGrantPeriod({ startDate: localDateSchema.parse('2026-11-20'), durationDays: 90 })
    ).toEqual({ startDate: '2026-11-20', endDate: '2027-02-17' })
  })

  it('1日なら、始まる日だけ', () => {
    expect(
      calcGrantPeriod({ startDate: localDateSchema.parse('2026-12-31'), durationDays: 1 })
    ).toEqual({ startDate: '2026-12-31', endDate: '2026-12-31' })
  })
})
