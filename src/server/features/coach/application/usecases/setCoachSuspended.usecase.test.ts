import { describe, expect, it, vi } from 'vitest'
import { setCoachSuspended } from './setCoachSuspended.usecase'

type Deps = Parameters<typeof setCoachSuspended>[1]
const now = new Date('2026-11-16T00:00:00Z')

const setup = (isCoach: boolean) => {
  const saveCoachSuspended = vi.fn<Deps['saveCoachSuspended']>(async () => undefined)
  const deps: Deps = { isCoach: async () => isCoach, saveCoachSuspended }
  return { deps, saveCoachSuspended }
}

describe('setCoachSuspended', () => {
  it('止めるときは日時を、再開するときは null を記録する', async () => {
    const { deps, saveCoachSuspended } = setup(true)
    await setCoachSuspended({ coachUserId: 'c1', suspended: true, now }, deps)
    await setCoachSuspended({ coachUserId: 'c1', suspended: false, now }, deps)
    expect(saveCoachSuspended.mock.calls).toEqual([
      ['c1', now],
      ['c1', null],
    ])
  })

  it('コーチでなければ not_found', async () => {
    const { deps, saveCoachSuspended } = setup(false)
    expect(await setCoachSuspended({ coachUserId: 'x', suspended: true, now }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(saveCoachSuspended).not.toHaveBeenCalled()
  })
})
