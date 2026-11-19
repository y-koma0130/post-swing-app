import { describe, expect, it } from 'vitest'
import { feeRateSchema } from './Campaign'

const valid = (rate: number) => feeRateSchema.safeParse(rate).success

describe('feeRateSchema', () => {
  it('0〜基本の率（10%）なら受け付ける', () => {
    expect(valid(0)).toBe(true)
    expect(valid(0.05)).toBe(true)
    expect(valid(0.1)).toBe(true)
  })

  it('マイナスや、基本の率より高い率は受け付けない（特典で手数料は上がらない）', () => {
    expect(valid(-0.01)).toBe(false)
    expect(valid(0.11)).toBe(false)
  })
})
