import { describe, expect, it } from 'vitest'
import { calcFeeAdjustment } from './calcFeeAdjustment.service'

describe('calcFeeAdjustment', () => {
  it('多く取っていたら差額を戻す', () => {
    expect(
      calcFeeAdjustment({ chargedApplicationFeeYen: 598, expectedApplicationFeeYen: 200 })
    ).toBe(398)
  })

  it('正しい額なら何もしない。少なかったら追加では取らない', () => {
    expect(
      calcFeeAdjustment({ chargedApplicationFeeYen: 200, expectedApplicationFeeYen: 200 })
    ).toBe(0)
    expect(
      calcFeeAdjustment({ chargedApplicationFeeYen: 200, expectedApplicationFeeYen: 598 })
    ).toBe(0)
  })
})
