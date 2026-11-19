import { describe, expect, it, vi } from 'vitest'
import { cleanupDrillVideos } from './cleanupDrillVideos.usecase'

type Deps = Parameters<typeof cleanupDrillVideos>[1]

describe('cleanupDrillVideos', () => {
  it('24時間より前の、使われていない動画を R2 と表から消す', async () => {
    const findOrphanDrillVideos = vi.fn<Deps['findOrphanDrillVideos']>(async () => [
      { id: 'v1', r2Key: 'drill-videos/c/v1' },
    ])
    const deleteMediaObject = vi.fn<Deps['deleteMediaObject']>(async () => undefined)
    const deleteDrillVideos = vi.fn<Deps['deleteDrillVideos']>(async () => undefined)
    const now = new Date('2026-11-19T00:00:00Z')

    expect(
      await cleanupDrillVideos(
        { now },
        { findOrphanDrillVideos, deleteMediaObject, deleteDrillVideos }
      )
    ).toEqual({ deleted: 1 })
    expect(findOrphanDrillVideos).toHaveBeenCalledWith(new Date('2026-11-18T00:00:00Z'))
    expect(deleteMediaObject).toHaveBeenCalledWith('drill-videos/c/v1')
    expect(deleteDrillVideos).toHaveBeenCalledWith(['v1'])
  })
})
