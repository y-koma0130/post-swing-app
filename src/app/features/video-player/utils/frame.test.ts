import { describe, expect, it } from 'vitest'
import { frameDurationFromRate, stepFrameTime } from './frame'

describe('frameDurationFromRate', () => {
  it('iPhone の 119.88fps は 120fps に寄せる', () => {
    expect(frameDurationFromRate(119.88)).toBe(1 / 120)
  })

  it('29.97fps は 30fps に寄せる', () => {
    expect(frameDurationFromRate(29.97)).toBe(1 / 30)
  })

  it('よくある値から遠ければ、そのまま使う', () => {
    expect(frameDurationFromRate(90)).toBe(1 / 90)
  })
})

describe('stepFrameTime', () => {
  it('120fps なら1コマは 1/120 秒', () => {
    const frameDurationSec = frameDurationFromRate(120)
    const next = stepFrameTime({ currentTimeSec: 0, frames: 1, frameDurationSec, durationSec: 7 })
    expect(next).toBeCloseTo(1.5 / 120)
  })
})
