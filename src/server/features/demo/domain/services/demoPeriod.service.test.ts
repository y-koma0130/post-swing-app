import { describe, expect, it } from 'vitest'
import { calcDemoExpiresAt, isDemoActive, isDemoSampleKey } from './demoPeriod.service'

describe('calcDemoExpiresAt', () => {
  it('作ってから7日後', () => {
    expect(calcDemoExpiresAt(new Date('2026-11-20T10:00:00Z'))).toEqual(
      new Date('2026-11-27T10:00:00Z')
    )
  })
})

describe('isDemoActive', () => {
  const expiresAt = new Date('2026-11-27T10:00:00Z')
  it('期限の前は使える。期限の時刻ちょうどからは使えない', () => {
    expect(isDemoActive(expiresAt, new Date('2026-11-27T09:59:59Z'))).toBe(true)
    expect(isDemoActive(expiresAt, expiresAt)).toBe(false)
  })
})

describe('isDemoSampleKey', () => {
  it('お手本の動画の場所だけを、お手本とみなす', () => {
    expect(isDemoSampleKey('demo/samples/front.mp4')).toBe(true)
    expect(isDemoSampleKey('videos/t1/v1')).toBe(false)
    expect(isDemoSampleKey('demo/other.mp4')).toBe(false)
  })
})
