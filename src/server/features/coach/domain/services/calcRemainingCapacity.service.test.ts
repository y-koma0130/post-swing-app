import { describe, expect, it } from 'vitest'
import { calcRemainingCapacity } from './calcRemainingCapacity.service'

describe('calcRemainingCapacity', () => {
  it('受付枠から、終わっていないレッスンの数を引く', () => {
    expect(calcRemainingCapacity({ monthlyCapacity: 10 }, 3)).toBe(7)
  })

  it('ちょうど満枠なら0', () => {
    expect(calcRemainingCapacity({ monthlyCapacity: 10 }, 10)).toBe(0)
  })

  it('枠を減らして超えていても、0未満にはならない', () => {
    expect(calcRemainingCapacity({ monthlyCapacity: 5 }, 8)).toBe(0)
  })
})
