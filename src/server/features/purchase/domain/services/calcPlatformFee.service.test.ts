import { describe, expect, it } from 'vitest'
import { calcPlatformFee } from './calcPlatformFee.service'

describe('calcPlatformFee', () => {
  it('価格 × 手数料率', () => {
    expect(calcPlatformFee({ priceYen: 4980, platformFeeRate: 0.1 })).toBe(498)
  })

  it('円未満は切り捨てる（コーチに不利にならないように）', () => {
    expect(calcPlatformFee({ priceYen: 3985, platformFeeRate: 0.1 })).toBe(398)
  })

  it('特典の0%なら0円', () => {
    expect(calcPlatformFee({ priceYen: 4980, platformFeeRate: 0 })).toBe(0)
  })
})
