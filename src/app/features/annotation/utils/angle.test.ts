import { describe, expect, it } from 'vitest'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { dragHandle, handleAt, handlesOf, hitTest, translate } from './editing'
import { angleDegrees, angleMarker, buildAngle } from './shapes'

const vertex = { x: 0.5, y: 0.5 }

describe('angleDegrees', () => {
  it('2本の線の間の角度を、0〜180 の整数で出す', () => {
    expect(angleDegrees(vertex, { x: 0.9, y: 0.5 }, { x: 0.5, y: 0.1 }, 1)).toBe(90)
    expect(angleDegrees(vertex, { x: 0.9, y: 0.5 }, { x: 0.1, y: 0.5 }, 1)).toBe(180)
    expect(angleDegrees(vertex, { x: 0.9, y: 0.5 }, { x: 0.9, y: 0.1 }, 1)).toBe(45)
  })

  it('縦動画では、画面の縦横比で測る（見た目どおりの角度になる）', () => {
    // 幅1・高さ2の動画で、右に0.2・上に0.1（画面では同じ長さ）は45°
    expect(angleDegrees(vertex, { x: 0.7, y: 0.5 }, { x: 0.7, y: 0.4 }, 2)).toBe(45)
  })

  it('線の長さが 0 なら 0', () => {
    expect(angleDegrees(vertex, vertex, { x: 0.9, y: 0.5 }, 1)).toBe(0)
  })
})

describe('buildAngle', () => {
  it('頂点と2本の線の先から角度の図形を作る', () => {
    expect(
      buildAngle({
        vertex,
        a: { x: 0.9, y: 0.5 },
        b: { x: 0.5, y: 0.1 },
        color: '#FFFFFF',
        aspect: 1,
      })
    ).toEqual({
      kind: 'angle',
      vertex,
      a: { x: 0.9, y: 0.5 },
      b: { x: 0.5, y: 0.1 },
      color: '#FFFFFF',
    })
  })

  it('どちらかの線が短すぎるときは作らない（タップの誤操作）', () => {
    expect(
      buildAngle({
        vertex,
        a: { x: 0.501, y: 0.5 },
        b: { x: 0.5, y: 0.1 },
        color: '#FFFFFF',
        aspect: 1,
      })
    ).toBeNull()
  })
})

describe('angleMarker', () => {
  it('弧は内側の角に描き、数字は2本の線の真ん中の向きに置く', () => {
    // 右（0）と上（-π/2）の間の90°。内側は右上
    const marker = angleMarker({ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 100, y: 0 }, 10)
    expect(marker.endAngle - marker.startAngle).toBeCloseTo(Math.PI / 2)
    expect(marker.label.x).toBeGreaterThan(100)
    expect(marker.label.y).toBeLessThan(100)
  })

  it('a と b の順番が逆でも、同じ内側の角に描く', () => {
    const one = angleMarker({ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 100, y: 0 }, 10)
    const other = angleMarker({ x: 100, y: 100 }, { x: 100, y: 0 }, { x: 200, y: 100 }, 10)
    expect(other.label.x).toBeCloseTo(one.label.x)
    expect(other.label.y).toBeCloseTo(one.label.y)
  })
})

describe('角度の図形の編集', () => {
  const angle: Annotation = {
    kind: 'angle',
    vertex,
    a: { x: 0.9, y: 0.5 },
    b: { x: 0.5, y: 0.1 },
    color: '#FFFFFF',
  }

  it('つまみは頂点と2本の線の先の3つ', () => {
    expect(handlesOf(angle).map((h) => h.id)).toEqual(['vertex', 'a', 'b'])
    expect(handleAt(angle, { x: 0.5, y: 0.5 }, 1)).toBe('vertex')
    expect(handleAt(angle, { x: 0.5, y: 0.11 }, 1)).toBe('b')
    expect(handleAt(angle, { x: 0.7, y: 0.5 }, 1)).toBe('move')
  })

  it('どちらの線の近くを押しても選べる', () => {
    expect(hitTest([angle], { x: 0.5, y: 0.3 }, 1)).toBe(0)
    expect(hitTest([angle], { x: 0.8, y: 0.2 }, 1)).toBe(-1)
  })

  it('つまみで1点だけ動かせ、全体もずらせる', () => {
    const moved = dragHandle(angle, 'b', { x: 0.5, y: 0.1 }, { x: 0.2, y: 0.2 }, 1)
    expect(moved.kind === 'angle' && moved.b).toEqual({ x: 0.2, y: 0.2 })
    expect(moved.kind === 'angle' && moved.vertex).toEqual(vertex)
    const shifted = translate(angle, 0.1, 0)
    expect(shifted.kind === 'angle' && shifted.vertex).toEqual({ x: 0.6, y: 0.5 })
  })
})
