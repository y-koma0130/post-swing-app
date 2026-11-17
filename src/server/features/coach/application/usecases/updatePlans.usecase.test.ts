import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PLANS } from '../../domain/rules'
import { priceYenSchema } from '../../domain/values/PriceYen'
import { updatePlans } from './updatePlans.usecase'

const actor = { userId: 'coach-1', name: '山田' }

describe('updatePlans', () => {
  it('コーチなら保存する', async () => {
    const savePlans = vi.fn(async () => undefined)
    const result = await updatePlans(
      { actor, plans: DEFAULT_PLANS },
      { isCoach: async () => true, savePlans }
    )
    expect(result.ok).toBe(true)
    expect(savePlans).toHaveBeenCalledWith('coach-1', DEFAULT_PLANS)
  })

  it('コーチでない人は not_found', async () => {
    const savePlans = vi.fn()
    const result = await updatePlans(
      { actor, plans: DEFAULT_PLANS },
      { isCoach: async () => false, savePlans }
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(savePlans).not.toHaveBeenCalled()
  })

  it('最低価格を下回るプランがあれば保存しない', async () => {
    const savePlans = vi.fn()
    const cheap = DEFAULT_PLANS.map((p) =>
      p.kind === 'single' ? { ...p, price: priceYenSchema.parse(2980) } : p
    )
    const result = await updatePlans(
      { actor, plans: cheap },
      { isCoach: async () => true, savePlans }
    )
    expect(result).toEqual({ ok: false, error: 'below_minimum' })
    expect(savePlans).not.toHaveBeenCalled()
  })

  it('同じ種類のプランが2つあれば保存しない', async () => {
    const [trial] = DEFAULT_PLANS
    if (!trial) throw new Error('初期プランがありません')
    const result = await updatePlans(
      { actor, plans: [trial, trial] },
      { isCoach: async () => true, savePlans: vi.fn() }
    )
    expect(result).toEqual({ ok: false, error: 'duplicate_kind' })
  })
})
