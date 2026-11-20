import { describe, expect, it, vi } from 'vitest'
import { createDemoCoach } from './createDemoCoach.usecase'

const now = new Date('2026-11-20T00:00:00Z')
const hashToken = async (token: string) => `hash:${token}`

describe('createDemoCoach', () => {
  const setup = (isDemoEnabled = true) => {
    const saveDemoCoach = vi.fn(async () => undefined)
    const deps = {
      isDemoEnabled,
      generateId: () => 'coach-1',
      generateToken: () => 'token-1',
      hashToken,
      generateSlug: () => 'demo-abc12345',
      generateMonitorCode: () => 'ABCD2345',
      saveDemoCoach,
    }
    return { deps, saveDemoCoach }
  }

  it('デモのコーチを作り、期限は7日後。トークンはハッシュにして保存する', async () => {
    const { deps, saveDemoCoach } = setup()
    expect(await createDemoCoach({ name: ' 山田 太郎 ', now }, deps)).toEqual({
      ok: true,
      value: {
        coachUserId: 'coach-1',
        token: 'token-1',
        expiresAt: new Date('2026-11-27T00:00:00Z'),
      },
    })
    expect(saveDemoCoach).toHaveBeenCalledWith(
      expect.objectContaining({ coachName: '山田 太郎', tokenHash: 'hash:token-1' })
    )
  })

  it('staging・開発中でなければ作れない', async () => {
    const { deps, saveDemoCoach } = setup(false)
    expect(await createDemoCoach({ name: '山田', now }, deps)).toEqual({
      ok: false,
      error: 'not_enabled',
    })
    expect(saveDemoCoach).not.toHaveBeenCalled()
  })

  it('名前が空・長すぎるときは作らない', async () => {
    const { deps } = setup()
    expect((await createDemoCoach({ name: '  ', now }, deps)).ok).toBe(false)
    expect((await createDemoCoach({ name: 'あ'.repeat(31), now }, deps)).ok).toBe(false)
  })
})
