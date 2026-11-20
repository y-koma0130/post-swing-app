import { describe, expect, it, vi } from 'vitest'
import { deleteExpiredDemos } from './deleteExpiredDemos.usecase'

const now = new Date('2026-11-20T00:00:00Z')

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
