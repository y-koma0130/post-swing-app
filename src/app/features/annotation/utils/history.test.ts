import { describe, expect, it } from 'vitest'
import type { Annotation } from '@/server/features/thread/domain/values/Annotation'
import { EMPTY_ANNOTATION_HISTORY, reduceAnnotationHistory } from './history'

const a: Annotation = { kind: 'line', from: { x: 0, y: 0 }, to: { x: 1, y: 1 }, color: '#FFFFFF' }
const b: Annotation = { kind: 'circle', center: { x: 0.5, y: 0.5 }, radius: 0.1, color: '#FFD54A' }

const withTwo = [a, b].reduce(
  (h, annotation) => reduceAnnotationHistory(h, { type: 'add', annotation }),
  EMPTY_ANNOTATION_HISTORY
)

describe('reduceAnnotationHistory', () => {
  it('置いた図形を直せて、元に戻せる', () => {
    const bigger = { ...b, radius: 0.2 }
    const updated = reduceAnnotationHistory(withTwo, {
      type: 'update',
      index: 1,
      annotation: bigger,
    })
    expect(updated.present).toEqual([a, bigger])
    expect(reduceAnnotationHistory(updated, { type: 'undo' }).present).toEqual([a, b])
  })

  it('1つだけ消せて、元に戻せる', () => {
    const removed = reduceAnnotationHistory(withTwo, { type: 'remove', index: 0 })
    expect(removed.present).toEqual([b])
    expect(reduceAnnotationHistory(removed, { type: 'undo' }).present).toEqual([a, b])
  })

  it('ない図形は直さない・消さない', () => {
    expect(reduceAnnotationHistory(withTwo, { type: 'remove', index: 5 })).toBe(withTwo)
    expect(reduceAnnotationHistory(withTwo, { type: 'update', index: 5, annotation: a })).toBe(
      withTwo
    )
  })
})
