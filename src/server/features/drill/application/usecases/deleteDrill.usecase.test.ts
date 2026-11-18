import { describe, expect, it, vi } from 'vitest'
import { deleteDrill } from './deleteDrill.usecase'

type Deps = Parameters<typeof deleteDrill>[1]

const setup = (owner: string | null) => {
  const remove = vi.fn<Deps['deleteDrill']>(async () => undefined)
  const deps: Deps = { findDrillOwner: async () => owner, deleteDrill: remove }
  return { deps, remove }
}

describe('deleteDrill', () => {
  it('自分のドリルは消せる', async () => {
    const { deps, remove } = setup('coach-1')
    expect(
      await deleteDrill({ actor: { userId: 'coach-1', name: '' }, drillId: 'd1' }, deps)
    ).toEqual({ ok: true, value: undefined })
    expect(remove).toHaveBeenCalledWith('d1')
  })

  it('ほかのコーチのドリルは消せない', async () => {
    const { deps, remove } = setup('coach-2')
    expect(
      await deleteDrill({ actor: { userId: 'coach-1', name: '' }, drillId: 'd1' }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(remove).not.toHaveBeenCalled()
  })

  it('ないドリルは not_found', async () => {
    const { deps } = setup(null)
    expect(
      (await deleteDrill({ actor: { userId: 'coach-1', name: '' }, drillId: 'x' }, deps)).ok
    ).toBe(false)
  })
})
