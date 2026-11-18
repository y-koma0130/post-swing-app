import { describe, expect, it, vi } from 'vitest'
import { markThreadRead } from './markThreadRead.usecase'

type Deps = Parameters<typeof markThreadRead>[1]
const now = new Date('2026-11-16T00:00:00Z')

const setup = () => {
  const saveThreadRead = vi.fn<Deps['saveThreadRead']>(async () => undefined)
  const deps: Deps = {
    findThreadMembers: async (id) =>
      id === 't1' ? { coachUserId: 'coach', studentUserId: 'student' } : null,
    saveThreadRead,
  }
  return { deps, saveThreadRead }
}

describe('markThreadRead', () => {
  it('コーチも生徒も、自分のスレッドを開いたら記録する', async () => {
    const { deps, saveThreadRead } = setup()
    for (const userId of ['coach', 'student']) {
      expect(
        await markThreadRead({ actor: { userId, name: '' }, threadId: 't1', now }, deps)
      ).toEqual({ ok: true, value: null })
    }
    expect(saveThreadRead).toHaveBeenCalledWith({ threadId: 't1', userId: 'student', at: now })
  })

  it('ほかの人・ないスレッドは記録しない', async () => {
    const { deps, saveThreadRead } = setup()
    expect(
      await markThreadRead({ actor: { userId: 'x', name: '' }, threadId: 't1', now }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(
      await markThreadRead({ actor: { userId: 'coach', name: '' }, threadId: 'none', now }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(saveThreadRead).not.toHaveBeenCalled()
  })
})
