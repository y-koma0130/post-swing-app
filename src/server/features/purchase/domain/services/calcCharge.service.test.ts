import { describe, expect, it } from 'vitest'
import { calcCharge, calcSubscriptionFeePercent } from './calcCharge.service'

describe('calcCharge', () => {
  it('生徒は価格＋システム利用料を払い、コーチの売上は価格の90%', () => {
    expect(calcCharge({ priceYen: 4980, systemFeeYen: 249, platformFeeRate: 0.1 })).toEqual({
      totalYen: 5229,
      platformFeeYen: 498,
      applicationFeeYen: 747,
    })
  })

  it('以前の申し込み（利用料0円）は、今まで通り価格の10%', () => {
    expect(calcCharge({ priceYen: 3980, systemFeeYen: 0, platformFeeRate: 0.1 })).toEqual({
      totalYen: 3980,
      platformFeeYen: 398,
      applicationFeeYen: 398,
    })
  })

  it('特典で手数料0%なら、プラットフォームの取り分はシステム利用料だけ（コーチは価格の100%）', () => {
    expect(calcCharge({ priceYen: 3980, systemFeeYen: 200, platformFeeRate: 0 })).toEqual({
      totalYen: 4180,
      platformFeeYen: 0,
      applicationFeeYen: 200,
    })
  })

  it('手数料の円未満は切り捨て', () => {
    expect(
      calcCharge({ priceYen: 3985, systemFeeYen: 200, platformFeeRate: 0.05 }).platformFeeYen
    ).toBe(199)
  })
})

describe('calcSubscriptionFeePercent', () => {
  it('毎月の取り分が calcCharge とほぼ同じ（1円未満のずれ）になる割合', () => {
    const percent = calcSubscriptionFeePercent({
      priceYen: 3980,
      systemFeeYen: 200,
      platformFeeRate: 0.1,
    })
    expect(percent).toBe(14.31)
    expect(Math.abs((4180 * percent) / 100 - 598)).toBeLessThan(1)
    expect(
      calcSubscriptionFeePercent({ priceYen: 3980, systemFeeYen: 0, platformFeeRate: 0.1 })
    ).toBe(10)
  })

  it('特典で0%なら、システム利用料の分だけ', () => {
    expect(
      calcSubscriptionFeePercent({ priceYen: 3980, systemFeeYen: 200, platformFeeRate: 0 })
    ).toBe(4.78)
  })
})
