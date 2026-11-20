import { describe, expect, it, vi } from 'vitest'
import type { MonitorCode } from '../../domain/values/MonitorCode'
import { resolveMonitorCode } from './resolveMonitorCode.usecase'

type Deps = Parameters<typeof resolveMonitorCode>[1]

const now = new Date('2026-11-19T00:00:00Z')
const code: MonitorCode = {
  id: 'code-1',
  coachUserId: 'coach-1',
  code: 'ABCD2345',
  label: 'インスタ募集',
  priceYen: 1000,
  maxUses: 3,
  expiresOn: null,
  active: true,
  createdAt: now,
}

const setup = (overrides: Partial<Deps> = {}) => {
  const findMonitorCodeByText = vi.fn<Deps['findMonitorCodeByText']>(async (coachUserId, text) =>
    coachUserId === 'coach-1' && text === 'ABCD2345' ? code : null
  )
  const deps: Deps = {
    findMonitorCodeByText,
    countCodeUses: async () => 1,
    hasMonitorPurchase: async () => false,
    ...overrides,
  }
  return { deps, findMonitorCodeByText }
}

const params = { coachUserId: 'coach-1', studentUserId: 'student-1', code: ' abcd2345 ', now }

describe('resolveMonitorCode', () => {
  it('小文字・前後の空白があっても、そのコーチのコードならモニター価格を返す', async () => {
    const { deps, findMonitorCodeByText } = setup()
    expect(await resolveMonitorCode(params, deps)).toEqual({
      ok: true,
      value: { codeId: 'code-1', priceYen: 1000, maxUses: 3 },
    })
    expect(findMonitorCodeByText).toHaveBeenCalledWith('coach-1', 'ABCD2345')
  })

  it('ほかのコーチのコード・形の違うコードは見つからない', async () => {
    const { deps } = setup()
    expect(await resolveMonitorCode({ ...params, coachUserId: 'coach-2' }, deps)).toEqual({
      ok: false,
      error: 'code_not_found',
    })
    expect(await resolveMonitorCode({ ...params, code: 'XYZ' }, deps)).toEqual({
      ok: false,
      error: 'code_not_found',
    })
  })

  it('満員・すでにモニターになった生徒は使えない', async () => {
    expect(await resolveMonitorCode(params, setup({ countCodeUses: async () => 3 }).deps)).toEqual({
      ok: false,
      error: 'code_full',
    })
    expect(
      await resolveMonitorCode(params, setup({ hasMonitorPurchase: async () => true }).deps)
    ).toEqual({ ok: false, error: 'already_monitor' })
  })
})
