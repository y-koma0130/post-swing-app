import { describe, expect, it } from 'vitest'
import { decideSubscriptionPrice } from './decideSubscriptionPrice.service'

describe('decideSubscriptionPrice', () => {
  it('値下げは、いまの生徒にも反映する', () => {
    expect(decideSubscriptionPrice({ currentPriceYen: 4980, newPlanPriceYen: 3980 })).toBe(3980)
  })

  it('値上げ・同じ価格なら、いまの生徒は変えない', () => {
    expect(decideSubscriptionPrice({ currentPriceYen: 3980, newPlanPriceYen: 4980 })).toBeNull()
    expect(decideSubscriptionPrice({ currentPriceYen: 3980, newPlanPriceYen: 3980 })).toBeNull()
  })
})
