import { describe, expect, it, vi } from 'vitest'
import { lowerMonthlyPrices } from './lowerMonthlyPrices.usecase'

type Deps = Parameters<typeof lowerMonthlyPrices>[1]

const subs = [
  // 以前の申し込み（利用料200円固定のころ）
  { purchaseId: 'p1', subscriptionId: 'sub_1', priceYen: 4980, systemFeeYen: 200 },
  { purchaseId: 'p2', subscriptionId: 'sub_2', priceYen: 3980, systemFeeYen: 0 },
  // 価格の5%（299円）
  { purchaseId: 'p3', subscriptionId: 'sub_3', priceYen: 5980, systemFeeYen: 299 },
]

const setup = (failOn: string | null = null) => {
  const changeSubscriptionPrice = vi.fn<Deps['changeSubscriptionPrice']>(
    async (input) => input.subscriptionId !== failOn
  )
  const savePurchasePrice = vi.fn<Deps['savePurchasePrice']>(async () => undefined)
  const deps: Deps = {
    findActiveSubscriptions: async () => subs,
    changeSubscriptionPrice,
    savePurchasePrice,
    resolveFeeAt: async () => ({ rate: 0.1 }),
  }
  return { deps, changeSubscriptionPrice, savePurchasePrice }
}

describe('lowerMonthlyPrices', () => {
  it('新しい価格より高い月額だけ、次の請求から下げる。利用料は新しい価格で計算し直し、上げはしない', async () => {
    const { deps, changeSubscriptionPrice, savePurchasePrice } = setup()
    const result = await lowerMonthlyPrices(
      { coachUserId: 'c1', monthlyPriceYen: 4480, now: new Date() },
      deps
    )
    expect(result).toEqual({ ok: true, value: { lowered: 2, failed: 0 } })
    expect(changeSubscriptionPrice.mock.calls).toEqual([
      [{ subscriptionId: 'sub_1', priceYen: 4480, systemFeeYen: 200, platformFeeRate: 0.1 }],
      [{ subscriptionId: 'sub_3', priceYen: 4480, systemFeeYen: 224, platformFeeRate: 0.1 }],
    ])
    expect(savePurchasePrice.mock.calls).toEqual([
      ['p1', { priceYen: 4480, systemFeeYen: 200 }],
      ['p3', { priceYen: 4480, systemFeeYen: 224 }],
    ])
  })

  it('Stripe で変えられなかった月額は、記録も変えない', async () => {
    const { deps, savePurchasePrice } = setup('sub_1')
    const result = await lowerMonthlyPrices(
      { coachUserId: 'c1', monthlyPriceYen: 4480, now: new Date() },
      deps
    )
    expect(result).toEqual({ ok: true, value: { lowered: 1, failed: 1 } })
    expect(savePurchasePrice.mock.calls).toEqual([['p3', { priceYen: 4480, systemFeeYen: 224 }]])
  })
})
