import { describe, expect, it, vi } from 'vitest'
import { deleteDemoCoach } from './deleteDemoCoach.usecase'

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
