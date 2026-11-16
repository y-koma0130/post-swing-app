import { describe, expect, it, vi } from 'vitest'
import { createDrill } from './createDrill.usecase'

type Deps = Parameters<typeof createDrill>[1]

const drill = { title: 'タオルドリル', description: '脇にタオルを挟んで打つ' }

const setup = (isCoach: boolean) => {
  const saveDrill = vi.fn<Deps['saveDrill']>(async () => undefined)
  const deps: Deps = { isCoach: async () => isCoach, saveDrill, generateId: () => 'drill-1' }
  return { deps, saveDrill }
}

describe('createDrill', () => {
  it('コーチは自分のドリルとして登録できる', async () => {
    const { deps, saveDrill } = setup(true)
    expect(await createDrill({ actor: { userId: 'coach-1', name: '' }, drill }, deps)).toEqual({
      ok: true,
      value: { drillId: 'drill-1' },
    })
    expect(saveDrill).toHaveBeenCalledWith({ ...drill, id: 'drill-1', coachUserId: 'coach-1' })
  })

  it('コーチでなければ登録できない', async () => {
    const { deps, saveDrill } = setup(false)
    expect(await createDrill({ actor: { userId: 'student-1', name: '' }, drill }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(saveDrill).not.toHaveBeenCalled()
  })
})
