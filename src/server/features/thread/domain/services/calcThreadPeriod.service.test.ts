import { describe, expect, it } from 'vitest'
import { THREAD_RULES } from '../rules'
import { calcThreadPeriod } from './calcThreadPeriod.service'

describe('calcThreadPeriod', () => {
  it('始まった時刻から30日後が期限', () => {
    const startedAt = new Date('2026-11-19T15:30:00+09:00')
    expect(THREAD_RULES.durationDays).toBe(30)
    expect(calcThreadPeriod(startedAt)).toEqual({
      startedAt,
      expiresAt: new Date('2026-12-19T15:30:00+09:00'),
    })
  })
})
