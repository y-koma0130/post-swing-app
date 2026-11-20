import { describe, expect, it } from 'vitest'
import { resolveDemoLogin } from './resolveDemoLogin.usecase'

const now = new Date('2026-11-20T00:00:00Z')
const hashToken = async (token: string) => `hash:${token}`

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
