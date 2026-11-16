import { describe, expect, it } from 'vitest'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { dragHandle, handleAt, handlesOf, hitTest, translate } from './editing'

const line: Annotation = {
  kind: 'arrow',
  from: { x: 0.1, y: 0.1 },
  to: { x: 0.5, y: 0.1 },
  color: '#FFFFFF',
}
const circle: Annotation = {
  kind: 'circle',
  center: { x: 0.5, y: 0.5 },
  radius: 0.1,
  color: '#FFD54A',
}

describe('hitTest', () => {
  it('線の近くを押したら、その線を選ぶ', () => {
    expect(hitTest([line, circle], { x: 0.3, y: 0.11 }, 1)).toBe(0)
  })

  it('円は内側を押しても選べる。重なっていれば上に描いた方', () => {
    expect(hitTest([line, circle], { x: 0.52, y: 0.5 }, 1)).toBe(1)
    expect(hitTest([circle, { ...circle, color: '#FF6B5B' }], { x: 0.5, y: 0.5 }, 1)).toBe(1)
  })

  it('何もないところは -1', () => {
    expect(hitTest([line, circle], { x: 0.9, y: 0.9 }, 1)).toBe(-1)
  })
})

describe('handleAt', () => {
  it('線の端はつまみ、途中は移動', () => {
    expect(handleAt(line, { x: 0.11, y: 0.1 }, 1)).toBe('from')
    expect(handleAt(line, { x: 0.49, y: 0.1 }, 1)).toBe('to')
    expect(handleAt(line, { x: 0.3, y: 0.1 }, 1)).toBe('move')
    expect(handleAt(line, { x: 0.3, y: 0.5 }, 1)).toBeNull()
  })

  it('円は縁の右につまみ', () => {
    expect(handlesOf(circle)).toEqual([{ id: 'radius', point: { x: 0.6, y: 0.5 } }])
    expect(handleAt(circle, { x: 0.6, y: 0.5 }, 1)).toBe('radius')
  })
})

describe('dragHandle', () => {
  it('端を動かすと角度と長さが変わる', () => {
    expect(dragHandle(line, 'to', { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.4 }, 1)).toEqual({
      ...line,
      to: { x: 0.5, y: 0.4 },
    })
  })

  it('縁を動かすと円の大きさが変わる（小さくしすぎない）', () => {
    const bigger = dragHandle(circle, 'radius', { x: 0.6, y: 0.5 }, { x: 0.7, y: 0.5 }, 1)
    expect(bigger.kind === 'circle' && bigger.radius).toBeCloseTo(0.2)
    const tiny = dragHandle(circle, 'radius', { x: 0.6, y: 0.5 }, { x: 0.5, y: 0.5 }, 1)
    expect(tiny.kind === 'circle' && tiny.radius).toBe(0.01)
  })

  it('真ん中をつかむと全体が動き、動画の外には出ない', () => {
    expect(dragHandle(line, 'move', { x: 0.3, y: 0.1 }, { x: 0.3, y: 0.3 }, 1)).toEqual({
      ...line,
      from: { x: 0.1, y: expect.closeTo(0.3) },
      to: { x: 0.5, y: expect.closeTo(0.3) },
    })
    const moved = translate(line, 0.8, 0)
    expect(moved.kind === 'arrow' && moved.to.x).toBe(1)
  })
})
