import { describe, expect, it, vi } from 'vitest'
import { resolveLineRecipient } from './resolveLineRecipient.usecase'

type Deps = Parameters<typeof resolveLineRecipient>[1]

const setup = (
  overrides: Partial<Omit<Deps, 'saveLineFriend' | 'fetchLineFriendship'>> = {},
  fetched: boolean | null = true
) => {
  const saveLineFriend = vi.fn<Deps['saveLineFriend']>(async () => undefined)
  const fetchLineFriendship = vi.fn<Deps['fetchLineFriendship']>(async () => fetched)
  const deps: Deps = {
    findLineRecipient: async () => ({ lineUserId: 'U1', isFriend: null }),
    ...overrides,
    fetchLineFriendship,
    saveLineFriend,
  }
  return { deps, saveLineFriend, fetchLineFriendship }
}

describe('resolveLineRecipient', () => {
  it('LINE でログインしていなければ null', async () => {
    const { deps } = setup({ findLineRecipient: async () => null })
    expect(await resolveLineRecipient({ userId: 'u' }, deps)).toBeNull()
  })

  it('記録があれば LINE には問い合わせない', async () => {
    const { deps, fetchLineFriendship } = setup({
      findLineRecipient: async () => ({ lineUserId: 'U1', isFriend: false }),
    })
    expect(await resolveLineRecipient({ userId: 'u' }, deps)).toEqual({
      lineUserId: 'U1',
      isFriend: false,
    })
    expect(fetchLineFriendship).not.toHaveBeenCalled()
  })

  it('記録がなければ LINE に問い合わせ、結果を記録する', async () => {
    const { deps, saveLineFriend } = setup({}, true)
    expect(await resolveLineRecipient({ userId: 'u' }, deps)).toEqual({
      lineUserId: 'U1',
      isFriend: true,
    })
    expect(saveLineFriend).toHaveBeenCalledWith('U1', true)
  })

  it('問い合わせられなければ友だちでないものとし、記録はしない', async () => {
    const { deps, saveLineFriend } = setup({}, null)
    expect(await resolveLineRecipient({ userId: 'u' }, deps)).toEqual({
      lineUserId: 'U1',
      isFriend: false,
    })
    expect(saveLineFriend).not.toHaveBeenCalled()
  })
})
