import { describe, expect, it } from 'vitest'
import { COMPARE_GAP, compareLayout, MAX_COMPARE_EDGE } from './compareLayout'

describe('compareLayout', () => {
  it('縦長の2本は左右に並べ、高さをそろえる', () => {
    const layout = compareLayout({ width: 1080, height: 1920 }, { width: 720, height: 1280 })
    expect(layout.left.height).toBe(layout.right.height)
    expect(layout.right.x).toBe(layout.left.width + COMPARE_GAP)
    expect(layout.height).toBeLessThanOrEqual(1280)
    expect(Math.max(layout.width, layout.height)).toBeLessThanOrEqual(MAX_COMPARE_EDGE)
  })

  it('横長があれば上下に並べ、幅をそろえる', () => {
    const layout = compareLayout({ width: 1920, height: 1080 }, { width: 1080, height: 1920 })
    expect(layout.left.width).toBe(layout.right.width)
    expect(layout.right.y).toBe(layout.left.height + COMPARE_GAP)
    expect(Math.max(layout.width, layout.height)).toBeLessThanOrEqual(MAX_COMPARE_EDGE)
  })

  it('元の動画より大きくはしない', () => {
    const layout = compareLayout({ width: 360, height: 640 }, { width: 360, height: 640 })
    expect(layout.height).toBe(640)
  })
})
