import { describe, expect, it } from 'vitest'
import { frameDurationFromRate, frameStyle, stepFrameTime } from './frame'

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

describe('frameStyle', () => {
  it('縦横比を動画に合わせ、高さの上限から幅を決める', () => {
    expect(frameStyle({ width: 1080, height: 1920 }, '65dvh')).toEqual({
      width: 'min(100%, calc(65dvh * 0.5625))',
      aspectRatio: '1080 / 1920',
    })
  })

  it('読み込む前は縦長（9:16）を仮定する', () => {
    expect(frameStyle(null, '65dvh').aspectRatio).toBe('9 / 16')
  })
})
