import { describe, expect, it } from 'vitest'
import { calcSquareCrop } from './squareCrop'

describe('calcSquareCrop', () => {
  it('横長は左右を、縦長は上下を切って真ん中を残す', () => {
    expect(calcSquareCrop(4032, 3024)).toEqual({ sx: 504, sy: 0, size: 3024 })
    expect(calcSquareCrop(1080, 1920)).toEqual({ sx: 0, sy: 420, size: 1080 })
  })

  it('正方形はそのまま', () => {
    expect(calcSquareCrop(800, 800)).toEqual({ sx: 0, sy: 0, size: 800 })
  })
})
