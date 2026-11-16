import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PLANS } from '../../domain/rules'
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
