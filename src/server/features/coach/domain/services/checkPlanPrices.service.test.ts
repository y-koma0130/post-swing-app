import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANS } from '../rules'
import { priceYenSchema } from '../values/PriceYen'
import { checkPlanPrices } from './checkPlanPrices.service'

describe('checkPlanPrices', () => {
  it('初期のプランは最低価格以上', () => {
    expect(checkPlanPrices(DEFAULT_PLANS)).toBeNull()
  })

  it('最低価格を下回るプランの種類を返す（ちょうどなら通る）', () => {
    expect(
      checkPlanPrices([
        { kind: 'trial', price: priceYenSchema.parse(550) },
        { kind: 'single', price: priceYenSchema.parse(3979) },
        { kind: 'monthly', price: priceYenSchema.parse(3980) },
      ])
    ).toBe('single')
    expect(checkPlanPrices([{ kind: 'trial', price: priceYenSchema.parse(500) }])).toBe('trial')
  })
})
