import { describe, expect, it } from 'vitest'
import { linkedTime, moveTogether, needsResync, offsetOf } from './linkedPlayback'

describe('offsetOf', () => {
  it('右の時刻 − 左の時刻', () => {
    expect(offsetOf(1.2, 2.0)).toBeCloseTo(0.8)
    expect(offsetOf(2.0, 1.2)).toBeCloseTo(-0.8)
  })
})

describe('linkedTime', () => {
  it('ずれを保った右の時刻', () => {
    expect(linkedTime(1, 0.5, 10)).toBeCloseTo(1.5)
  })

  it('右の動画の先頭・末尾で止まる', () => {
    expect(linkedTime(0.2, -0.5, 10)).toBe(0)
    expect(linkedTime(9.8, 0.5, 10)).toBe(10)
  })
})

describe('needsResync', () => {
  it('少しのずれ（再生の揺れ）なら合わせ直さない', () => {
    expect(
      needsResync({ leftTimeSec: 1, rightTimeSec: 1.53, offsetSec: 0.5, rightDurationSec: 10 })
    ).toBe(false)
  })

  it('大きくずれたら合わせ直す', () => {
    expect(
      needsResync({ leftTimeSec: 1, rightTimeSec: 1.7, offsetSec: 0.5, rightDurationSec: 10 })
    ).toBe(true)
  })

  it('右が末尾で止まっていれば合わせ直さない', () => {
    expect(
      needsResync({ leftTimeSec: 9.9, rightTimeSec: 10, offsetSec: 0.5, rightDurationSec: 10 })
    ).toBe(false)
  })
})

describe('moveTogether', () => {
  it('左を動かすと、右はずれを保って付いていく', () => {
    expect(
      moveTogether({ leftTimeSec: 1, nextLeftTimeSec: 1.5, offsetSec: -0.3, rightDurationSec: 5 })
    ).toEqual({ left: 1.5, right: 1.2 })
  })
})
