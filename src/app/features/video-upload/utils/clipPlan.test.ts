import { describe, expect, it } from 'vitest'
import {
  adjustClipRange,
  CLIP_RULES,
  defaultClipRange,
  planBitrate,
  planOutputSize,
} from './clipPlan'

const MB = 1024 * 1024

describe('defaultClipRange', () => {
  it('短い動画は全部', () => {
    expect(defaultClipRange(8)).toEqual({ start: 0, end: 8 })
  })

  it('長い動画は先頭から60秒', () => {
    expect(defaultClipRange(95)).toEqual({ start: 0, end: CLIP_RULES.maxSeconds })
  })
})

describe('adjustClipRange', () => {
  it('60秒以内なら、開始を動かしても終了はそのまま', () => {
    expect(adjustClipRange({ start: 5, end: 50 }, 120, 'start')).toEqual({ start: 5, end: 50 })
  })

  it('終了を延ばして60秒を超えたら、開始を後ろへ寄せる', () => {
    expect(adjustClipRange({ start: 0, end: 90 }, 120, 'end')).toEqual({ start: 30, end: 90 })
  })

  it('開始を前へ戻して60秒を超えたら、終了を前へ寄せる', () => {
    expect(adjustClipRange({ start: 10, end: 100 }, 120, 'start')).toEqual({ start: 10, end: 70 })
  })

  it('開始を終了より後ろへ動かしたら、最短の長さを残して終了を押す', () => {
    expect(adjustClipRange({ start: 12, end: 10 }, 60, 'start')).toEqual({ start: 12, end: 12.5 })
  })

  it('動画の外には出ない', () => {
    expect(adjustClipRange({ start: -3, end: 99 }, 15, 'end')).toEqual({ start: 0, end: 15 })
  })
})

describe('planOutputSize', () => {
  it('4K の縦動画は長辺1920に縮め、縦横比を保つ', () => {
    expect(planOutputSize(2160, 3840)).toEqual({ width: 1080, height: 1920 })
  })

  it('小さい動画はそのまま', () => {
    expect(planOutputSize(1280, 720)).toEqual({ width: 1280, height: 720 })
  })

  it('幅・高さは偶数にする', () => {
    const { width, height } = planOutputSize(1919, 1081)
    expect(width % 2).toBe(0)
    expect(height % 2).toBe(0)
  })
})

describe('planBitrate', () => {
  const base = { width: 1920, height: 1080, seconds: 10, maxBytes: 100 * MB }

  it('1080p 30fps はおよそ 6Mbps', () => {
    const bitrate = planBitrate({ ...base, frameRate: 30 })
    expect(bitrate).toBeGreaterThan(5_000_000)
    expect(bitrate).toBeLessThan(7_000_000)
  })

  it('240fps は 30fps より高いが、8倍にはしない', () => {
    const at30 = planBitrate({ ...base, frameRate: 30 })
    const at240 = planBitrate({ ...base, frameRate: 240 })
    expect(at240).toBeGreaterThan(at30)
    expect(at240).toBeLessThan(at30 * 4)
  })

  it('長さと送信の上限から、出来上がりが上限を超えない', () => {
    const seconds = 60
    const bitrate = planBitrate({ ...base, frameRate: 240, width: 3840, height: 2160, seconds })
    expect((bitrate * seconds) / 8).toBeLessThanOrEqual(100 * MB * CLIP_RULES.sizeBudgetRatio)
  })

  it('フレームレートが分からなければ 30fps として扱う', () => {
    expect(planBitrate({ ...base, frameRate: 0 })).toBe(planBitrate({ ...base, frameRate: 30 }))
  })
})
