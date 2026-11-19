import { describe, expect, it, vi } from 'vitest'
import type { MonitorCode } from '../../domain/values/MonitorCode'
import { saveMonitorCode } from './saveMonitorCode.usecase'

type Deps = Parameters<typeof saveMonitorCode>[1]

const now = new Date('2026-11-19T00:00:00Z')
const coach = { userId: 'coach-1', name: '' }
const offer = { label: '知人用', priceYen: 0, maxUses: 3, expiresOn: null }
const existing: MonitorCode = {
  ...offer,
  id: 'code-1',
  coachUserId: 'coach-1',
  code: 'ABCD2345',
  active: true,
  createdAt: new Date('2026-11-01T00:00:00Z'),
}

const setup = (overrides: Partial<Deps> = {}) => {
  const saveMonitorCode = vi.fn<Deps['saveMonitorCode']>(async () => undefined)
  const deps: Deps = {
    findSinglePrice: async (id) => (id === 'coach-1' ? 4980 : null),
    findMonitorCode: async (id) => (id === 'code-1' ? existing : null),
    countActiveCodes: async () => 0,
    codeTaken: async () => false,
    saveMonitorCode,
    randomBytes: () => new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]),
    generateId: () => 'code-new',
    ...overrides,
  }
  return { deps, saveMonitorCode }
}

const params = { actor: coach, codeId: null, offer, active: true, regenerate: false, now }

describe('saveMonitorCode', () => {
  it('新しいコードを作る（コードの文字列は必ず作る）', async () => {
    const { deps, saveMonitorCode: save } = setup()
    expect(await saveMonitorCode(params, deps)).toEqual({
      ok: true,
      value: { codeId: 'code-new', code: 'ABCDEFGH' },
    })
    expect(save).toHaveBeenCalledWith(
      {
        ...offer,
        id: 'code-new',
        coachUserId: 'coach-1',
        code: 'ABCDEFGH',
        active: true,
        createdAt: now,
      },
      now
    )
  })

  it('内容を変えても、作り直さなければコードは変わらない', async () => {
    const { deps, saveMonitorCode: save } = setup()
    const result = await saveMonitorCode(
      { ...params, codeId: 'code-1', offer: { ...offer, maxUses: 5 } },
      deps
    )
    expect(result).toEqual({ ok: true, value: { codeId: 'code-1', code: 'ABCD2345' } })
    expect(save.mock.calls[0]?.[0]).toMatchObject({ maxUses: 5, createdAt: existing.createdAt })
  })

  it('作り直すと、コードの文字列が変わる', async () => {
    const { deps } = setup()
    expect(await saveMonitorCode({ ...params, codeId: 'code-1', regenerate: true }, deps)).toEqual({
      ok: true,
      value: { codeId: 'code-1', code: 'ABCDEFGH' },
    })
  })

  it('たまたまほかのコードと重なったら、作り直す', async () => {
    let n = 0
    const { deps } = setup({
      codeTaken: async (code) => code === 'ABCDEFGH',
      randomBytes: () => new Uint8Array(Array.from({ length: 8 }, () => (n++ < 8 ? n - 1 : 30))),
    })
    const result = await saveMonitorCode(params, deps)
    expect(result.ok && result.value.code).not.toBe('ABCDEFGH')
  })

  it('コーチでない・ほかのコーチのコードは not_found で、保存しない', async () => {
    const other = setup()
    expect(
      await saveMonitorCode({ ...params, actor: { userId: 'coach-2', name: '' } }, other.deps)
    ).toEqual({ ok: false, error: 'not_found' })
    const notMine = setup({
      findMonitorCode: async () => ({ ...existing, coachUserId: 'coach-2' }),
    })
    expect(await saveMonitorCode({ ...params, codeId: 'code-1' }, notMine.deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(other.saveMonitorCode).not.toHaveBeenCalled()
    expect(notMine.saveMonitorCode).not.toHaveBeenCalled()
  })

  it('1レッスンより安くない価格・受付中のコードが上限なら、保存しない', async () => {
    const pricey = setup()
    expect(
      await saveMonitorCode({ ...params, offer: { ...offer, priceYen: 5000 } }, pricey.deps)
    ).toEqual({ ok: false, error: 'price_not_discounted' })
    const full = setup({ countActiveCodes: async () => 5 })
    expect(await saveMonitorCode(params, full.deps)).toEqual({
      ok: false,
      error: 'too_many_active',
    })
    expect(full.saveMonitorCode).not.toHaveBeenCalled()
    // 止めたコードなら、上限でも保存できる
    expect((await saveMonitorCode({ ...params, active: false }, full.deps)).ok).toBe(true)
  })
})
