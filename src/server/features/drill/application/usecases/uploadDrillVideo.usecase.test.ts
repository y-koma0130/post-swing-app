import { describe, expect, it, vi } from 'vitest'
import { uploadDrillVideo } from './uploadDrillVideo.usecase'

type Deps = Parameters<typeof uploadDrillVideo>[1]

const now = new Date('2026-11-19T00:00:00Z')
const params = {
  actor: { userId: 'coach-1', name: '' },
  contentType: 'video/mp4',
  sizeBytes: 1024,
  durationSec: 12,
  frameRate: 30,
  now,
}

const setup = (isCoach = true) => {
  const storeVideo = vi.fn<Deps['storeVideo']>(async () => undefined)
  const saveDrillVideo = vi.fn<Deps['saveDrillVideo']>(async () => undefined)
  const deps: Deps = {
    isCoach: async () => isCoach,
    storeVideo,
    saveDrillVideo,
    generateId: () => 'video-1',
  }
  return { deps, storeVideo, saveDrillVideo }
}

describe('uploadDrillVideo', () => {
  it('コーチの動画として、コーチごとの場所に保存する', async () => {
    const { deps, storeVideo, saveDrillVideo } = setup()
    expect(await uploadDrillVideo(params, deps)).toEqual({
      ok: true,
      value: { videoId: 'video-1' },
    })
    expect(storeVideo).toHaveBeenCalledWith('drill-videos/coach-1/video-1', 'video/mp4')
    expect(saveDrillVideo).toHaveBeenCalledWith({
      id: 'video-1',
      coachUserId: 'coach-1',
      r2Key: 'drill-videos/coach-1/video-1',
      contentType: 'video/mp4',
      sizeBytes: 1024,
      durationSec: 12,
      frameRate: 30,
      uploadedAt: now,
    })
  })

  it('コーチでなければ上げられない', async () => {
    const { deps, storeVideo } = setup(false)
    expect(await uploadDrillVideo(params, deps)).toEqual({ ok: false, error: 'not_found' })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('生徒の動画と同じく、形式と長さを確かめる', async () => {
    const { deps } = setup()
    expect(await uploadDrillVideo({ ...params, contentType: 'image/png' }, deps)).toEqual({
      ok: false,
      error: 'unsupported_type',
    })
    expect(await uploadDrillVideo({ ...params, durationSec: 61 }, deps)).toEqual({
      ok: false,
      error: 'too_long',
    })
  })
})
