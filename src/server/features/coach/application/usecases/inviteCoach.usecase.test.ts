import { describe, expect, it, vi } from 'vitest'
import { coachSlugSchema } from '../../domain/values/CoachSlug'
import { inviteCoach } from './inviteCoach.usecase'

const params = {
  email: 'coach@example.com',
  name: '山田 太郎',
  slug: coachSlugSchema.parse('yamada'),
}

type Deps = Parameters<typeof inviteCoach>[1]

const deps = (overrides: Partial<Omit<Deps, 'saveInvitedCoach'>> = {}) => {
  const saveInvitedCoach = vi.fn<Deps['saveInvitedCoach']>(async () => undefined)
  return {
    saveInvitedCoach,
    deps: {
      findUserByEmail: async () => null,
      isSlugTaken: async () => false,
      generateId: () => 'new-user-id',
      ...overrides,
      saveInvitedCoach,
    } satisfies Deps,
  }
}

describe('inviteCoach', () => {
  it('新しい人なら user とコーチを作り、初期のプラン3つを付ける', async () => {
    const { deps: d, saveInvitedCoach } = deps()
    const result = await inviteCoach(params, d)
    expect(result).toEqual({ ok: true, value: { userId: 'new-user-id' } })
    const [coach, user] = saveInvitedCoach.mock.calls[0] ?? []
    expect(coach?.plans.map((p) => p.kind)).toEqual(['trial', 'single', 'monthly'])
    expect(coach?.chargesEnabled).toBe(false)
    expect(user).toEqual({ email: params.email, isNew: true })
  })

  it('生徒として登録済みの人は、その user をコーチにする', async () => {
    const { deps: d, saveInvitedCoach } = deps({
      findUserByEmail: async () => ({ id: 'student-id', isCoach: false }),
    })
    const result = await inviteCoach(params, d)
    expect(result).toEqual({ ok: true, value: { userId: 'student-id' } })
    expect(saveInvitedCoach.mock.calls[0]?.[1]).toEqual({ email: params.email, isNew: false })
  })

  it('すでにコーチなら招待しない', async () => {
    const { deps: d, saveInvitedCoach } = deps({
      findUserByEmail: async () => ({ id: 'c', isCoach: true }),
    })
    expect(await inviteCoach(params, d)).toEqual({ ok: false, error: 'already_coach' })
    expect(saveInvitedCoach).not.toHaveBeenCalled()
  })

  it('スラッグが使われていたら招待しない', async () => {
    const { deps: d } = deps({ isSlugTaken: async () => true })
    expect(await inviteCoach(params, d)).toEqual({ ok: false, error: 'slug_taken' })
  })
})
