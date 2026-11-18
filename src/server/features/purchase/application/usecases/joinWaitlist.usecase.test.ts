import { describe, expect, it, vi } from 'vitest'
import { joinWaitlist } from './joinWaitlist.usecase'

type Deps = Parameters<typeof joinWaitlist>[1]

const setup = (coachUserId: string | null) => {
  const saveWaitlistEntry = vi.fn<Deps['saveWaitlistEntry']>(async () => undefined)
  const deps: Deps = { findCoachUserIdBySlug: async () => coachUserId, saveWaitlistEntry }
  return { deps, saveWaitlistEntry }
}

const actor = { userId: 'student-1', name: '' }

describe('joinWaitlist', () => {
  it('コーチのキャンセル待ちに登録する', async () => {
    const { deps, saveWaitlistEntry } = setup('coach-1')
    expect(await joinWaitlist({ actor, coachSlug: 'yamada' }, deps)).toEqual({
      ok: true,
      value: undefined,
    })
    expect(saveWaitlistEntry).toHaveBeenCalledWith('coach-1', 'student-1')
  })

  it('自分自身のキャンセル待ちには入れない', async () => {
    const { deps, saveWaitlistEntry } = setup('student-1')
    expect(await joinWaitlist({ actor, coachSlug: 'me' }, deps)).toEqual({
      ok: false,
      error: 'own_coach',
    })
    expect(saveWaitlistEntry).not.toHaveBeenCalled()
  })

  it('ないコーチは not_found', async () => {
    const { deps } = setup(null)
    expect(await joinWaitlist({ actor, coachSlug: 'x' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
