import { describe, expect, it } from 'vitest'
import { annotationSchema, normalizedPointSchema } from './Annotation'

const color = '#ff3b30'
const line = (from: { x: number; y: number }, c = color) => ({
  kind: 'line',
  from,
  to: { x: 0.5, y: 0.5 },
  color: c,
})
const circle = (radius: number) => ({
  kind: 'circle',
  center: { x: 0.5, y: 0.5 },
  radius,
  color,
})

describe('normalizedPointSchema', () => {
  it('座標は 0〜1（端も含む）', () => {
    expect(normalizedPointSchema.safeParse({ x: 0, y: 0 }).success).toBe(true)
    expect(normalizedPointSchema.safeParse({ x: 1, y: 1 }).success).toBe(true)
  })

  it('0〜1 の外は受け付けない', () => {
    expect(normalizedPointSchema.safeParse({ x: -0.01, y: 0.5 }).success).toBe(false)
    expect(normalizedPointSchema.safeParse({ x: 0.5, y: 1.01 }).success).toBe(false)
  })
})

describe('annotationSchema', () => {
  it('線の端が 0〜1 の外なら受け付けない', () => {
    expect(annotationSchema.safeParse(line({ x: 0, y: 1 })).success).toBe(true)
    expect(annotationSchema.safeParse(line({ x: 1.5, y: 0 })).success).toBe(false)
  })

  it('色は #RRGGBB（大文字・小文字どちらでも）', () => {
    expect(annotationSchema.safeParse(line({ x: 0, y: 0 }, '#FF3B30')).success).toBe(true)
    expect(annotationSchema.safeParse(line({ x: 0, y: 0 }, '#f30')).success).toBe(false)
    expect(annotationSchema.safeParse(line({ x: 0, y: 0 }, 'ff3b30')).success).toBe(false)
    expect(annotationSchema.safeParse(line({ x: 0, y: 0 }, '#ff3b3g')).success).toBe(false)
    expect(annotationSchema.safeParse(line({ x: 0, y: 0 }, 'red')).success).toBe(false)
  })

  it('円の半径は 0 より大きく 1 まで', () => {
    expect(annotationSchema.safeParse(circle(0)).success).toBe(false)
    expect(annotationSchema.safeParse(circle(0.01)).success).toBe(true)
    expect(annotationSchema.safeParse(circle(1)).success).toBe(true)
    expect(annotationSchema.safeParse(circle(1.01)).success).toBe(false)
  })

  it('手書きの線は2点以上', () => {
    const free = (n: number) => ({
      kind: 'free',
      points: Array.from({ length: n }, () => ({ x: 0.5, y: 0.5 })),
      color,
    })
    expect(annotationSchema.safeParse(free(1)).success).toBe(false)
    expect(annotationSchema.safeParse(free(2)).success).toBe(true)
  })
})
