import { describe, expect, it, vi } from 'vitest'
import { setCoachAvatar } from './setCoachAvatar.usecase'

type Deps = Parameters<typeof setCoachAvatar>[1]
const actor = { userId: 'coach-1', name: '' }
const jpeg = { contentType: 'image/jpeg', sizeBytes: 80_000 }

const setup = (previous: string | null = null, isCoach = true) => {
  const calls: string[] = []
  const storeAvatar = vi.fn<Deps['storeAvatar']>(async (key) => {
    calls.push(`store ${key}`)
  })
  const saveAvatarKey = vi.fn<Deps['saveAvatarKey']>(async (_id, key) => {
    calls.push(`save ${key}`)
  })
  const deleteAvatarObject = vi.fn<Deps['deleteAvatarObject']>(async (key) => {
    calls.push(`delete ${key}`)
  })
  const deps: Deps = {
    isCoach: async () => isCoach,
    findAvatarKey: async () => previous,
    storeAvatar,
    saveAvatarKey,
    deleteAvatarObject,
    generateId: () => 'new',
  }
  return { deps, calls, storeAvatar }
}

describe('setCoachAvatar', () => {
  it('新しい画像を保存してから記録し、古い画像を消す', async () => {
    const { deps, calls } = setup('avatars/coach-1/old.jpg')
    expect(await setCoachAvatar({ actor, upload: jpeg }, deps)).toEqual({
      ok: true,
      value: undefined,
    })
    expect(calls).toEqual([
      'store avatars/coach-1/new.jpg',
      'save avatars/coach-1/new.jpg',
      'delete avatars/coach-1/old.jpg',
    ])
  })

  it('外すときは記録を消し、画像も消す', async () => {
    const { deps, calls } = setup('avatars/coach-1/old.jpg')
    await setCoachAvatar({ actor, upload: null }, deps)
    expect(calls).toEqual(['save null', 'delete avatars/coach-1/old.jpg'])
  })

  it('画像以外・1MB 超は保存しない', async () => {
    const { deps, storeAvatar } = setup()
    expect(
      await setCoachAvatar({ actor, upload: { contentType: 'image/gif', sizeBytes: 10 } }, deps)
    ).toEqual({ ok: false, error: 'unsupported_type' })
    expect(
      await setCoachAvatar({ actor, upload: { ...jpeg, sizeBytes: 2 * 1024 * 1024 } }, deps)
    ).toEqual({ ok: false, error: 'too_large' })
    expect(storeAvatar).not.toHaveBeenCalled()
  })

  it('コーチでなければ not_found', async () => {
    const { deps } = setup(null, false)
    expect(await setCoachAvatar({ actor, upload: jpeg }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
