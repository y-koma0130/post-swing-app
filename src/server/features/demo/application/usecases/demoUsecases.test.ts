import { describe, expect, it, vi } from 'vitest'
import { createDemoCoach } from './createDemoCoach.usecase'
import { deleteDemoCoach } from './deleteDemoCoach.usecase'
import { deleteExpiredDemos } from './deleteExpiredDemos.usecase'
import { reissueDemoLink } from './reissueDemoLink.usecase'
import { resolveDemoLogin } from './resolveDemoLogin.usecase'

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

describe('resolveDemoLogin', () => {
  const deps = (expiresAt: Date | null, isDemoEnabled = true) => ({
    isDemoEnabled,
    hashToken,
    findDemoCoachByTokenHash: async (hash: string) =>
      hash === 'hash:good' && expiresAt ? { userId: 'coach-1', expiresAt } : null,
  })
  const future = new Date('2026-11-21T00:00:00Z')

  it('期限内のデモのトークンなら、そのコーチとしてログインできる', async () => {
    expect(await resolveDemoLogin({ token: 'good', now }, deps(future))).toEqual({
      ok: true,
      value: { userId: 'coach-1' },
    })
  })

  it('知らないトークン・空のトークンでは入れない', async () => {
    expect(await resolveDemoLogin({ token: 'bad', now }, deps(future))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect((await resolveDemoLogin({ token: '', now }, deps(future))).ok).toBe(false)
  })

  it('期限を過ぎたら入れない', async () => {
    expect(await resolveDemoLogin({ token: 'good', now }, deps(now))).toEqual({
      ok: false,
      error: 'expired',
    })
  })

  it('staging・開発中でなければ入れない', async () => {
    expect(await resolveDemoLogin({ token: 'good', now }, deps(future, false))).toEqual({
      ok: false,
      error: 'not_enabled',
    })
  })
})

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

describe('deleteDemoCoach', () => {
  it('デモのデータを消し、返ってきた動画・画像のファイルを消す', async () => {
    const deleteMediaObject = vi.fn(async () => undefined)
    const result = await deleteDemoCoach(
      { coachUserId: 'coach-1' },
      { deleteDemoCoachData: async () => ['videos/t1/v1', 'cards/t1/c1.png'], deleteMediaObject }
    )
    expect(result).toEqual({ ok: true, value: { deletedObjects: 2 } })
    expect(deleteMediaObject).toHaveBeenCalledTimes(2)
  })

  it('デモでないコーチは消さない', async () => {
    const deleteMediaObject = vi.fn(async () => undefined)
    const result = await deleteDemoCoach(
      { coachUserId: 'real-coach' },
      { deleteDemoCoachData: async () => null, deleteMediaObject }
    )
    expect(result).toEqual({ ok: false, error: 'not_demo' })
    expect(deleteMediaObject).not.toHaveBeenCalled()
  })

  it('ファイルを消せなくても、ほかは続ける', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const deleteMediaObject = vi
      .fn<(key: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('r2'))
      .mockResolvedValue(undefined)
    const result = await deleteDemoCoach(
      { coachUserId: 'coach-1' },
      { deleteDemoCoachData: async () => ['a', 'b'], deleteMediaObject }
    )
    expect(result).toEqual({ ok: true, value: { deletedObjects: 1 } })
    error.mockRestore()
  })
})

describe('deleteExpiredDemos', () => {
  it('期限を過ぎたデモを消す。1人が失敗しても、ほかは続ける', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const deleteDemo = vi
      .fn<(id: string) => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('db'))
      .mockResolvedValue(undefined)
    const result = await deleteExpiredDemos(
      { now },
      { findExpiredDemoCoaches: async () => ['d1', 'd2'], deleteDemoCoach: deleteDemo }
    )
    expect(result).toEqual({ ok: true, value: { deleted: 1 } })
    expect(deleteDemo).toHaveBeenCalledWith('d2')
    error.mockRestore()
  })
})
