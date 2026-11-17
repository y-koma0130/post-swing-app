import { describe, expect, it } from 'vitest'
import { calcCharge, calcSubscriptionFeePercent } from './calcCharge.service'

describe('calcCharge', () => {
  it('生徒は価格＋システム利用料を払い、コーチの売上は価格の90%', () => {
    expect(calcCharge({ priceYen: 4980, systemFeeYen: 200 })).toEqual({
      totalYen: 5180,
      applicationFeeYen: 698,
    })
  })

  it('以前の申し込み（利用料0円）は、今まで通り価格の10%', () => {
    expect(calcCharge({ priceYen: 3980, systemFeeYen: 0 })).toEqual({
      totalYen: 3980,
      applicationFeeYen: 398,
    })
  })
})

describe('calcSubscriptionFeePercent', () => {
  it('毎月の取り分が calcCharge とほぼ同じ（1円未満のずれ）になる割合', () => {
    const percent = calcSubscriptionFeePercent({ priceYen: 3980, systemFeeYen: 200 })
    expect(percent).toBe(14.31)
    expect(Math.abs((4180 * percent) / 100 - 598)).toBeLessThan(1)
    expect(calcSubscriptionFeePercent({ priceYen: 3980, systemFeeYen: 0 })).toBe(10)
  })
})
