import { describe, expect, it, vi } from 'vitest'
import { reissueDemoLink } from './reissueDemoLink.usecase'

const hashToken = async (token: string) => `hash:${token}`

describe('reissueDemoLink', () => {
  it('デモのコーチなら、新しいトークンを作って保存する', async () => {
    const saveDemoTokenHash = vi.fn(async () => true)
    const result = await reissueDemoLink(
      { coachUserId: 'coach-1' },
      { isDemoEnabled: true, generateToken: () => 'token-2', hashToken, saveDemoTokenHash }
    )
    expect(result).toEqual({ ok: true, value: { token: 'token-2' } })
    expect(saveDemoTokenHash).toHaveBeenCalledWith('coach-1', 'hash:token-2')
  })

  it('デモでないコーチには作らない', async () => {
    const result = await reissueDemoLink(
      { coachUserId: 'real-coach' },
      {
        isDemoEnabled: true,
        generateToken: () => 'token-2',
        hashToken,
        saveDemoTokenHash: async () => false,
      }
    )
    expect(result).toEqual({ ok: false, error: 'not_demo' })
  })
})
