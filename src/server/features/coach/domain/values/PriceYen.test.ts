import { describe, expect, it } from 'vitest'
import { priceYenSchema } from './PriceYen'

const valid = (value: number) => priceYenSchema.safeParse(value).success

describe('priceYenSchema', () => {
  it('Stripe の最低決済額（50円）以上の整数', () => {
    expect(valid(50)).toBe(true)
    expect(valid(4980)).toBe(true)
  })

  it('50円未満は受け付けない', () => {
    expect(valid(49)).toBe(false)
    expect(valid(0)).toBe(false)
  })

  it('整数でない価格は受け付けない', () => {
    expect(valid(50.5)).toBe(false)
  })
})
