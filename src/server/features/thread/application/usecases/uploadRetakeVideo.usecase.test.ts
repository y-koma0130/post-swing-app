import { describe, expect, it, vi } from 'vitest'
import { openRetake, retakeThread } from './retakeTestFixtures'
import { uploadRetakeVideo } from './uploadRetakeVideo.usecase'

type Deps = Parameters<typeof uploadRetakeVideo>[1]

const params = {
  actor: { userId: 'student-1', name: '' },
  threadId: 'thread-1',
  contentType: 'video/mp4',
  sizeBytes: 1000,
  angle: 'back',
  durationSec: 10,
  frameRate: 30,
  now: new Date('2026-11-12T00:00:00Z'),
}

const setup = (requests = [openRetake()]) => {
  const storeVideo = vi.fn<Deps['storeVideo']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => retakeThread(),
    findRetakeRequests: async () => requests,
    storeVideo,
    saveDraftVideo: async () => undefined,
    generateId: () => 'v-2',
  }
  return { deps, storeVideo }
}

describe('uploadRetakeVideo', () => {
  it('お願いが開いていれば、提出の回数とは別に動画を上げられる', async () => {
    const { deps, storeVideo } = setup()
    expect(await uploadRetakeVideo(params, deps)).toEqual({ ok: true, value: { videoId: 'v-2' } })
    expect(storeVideo).toHaveBeenCalledWith('videos/thread-1/v-2', 'video/mp4')
  })

  it('お願いがなければ上げられない。本人の生徒だけ', async () => {
    const { deps, storeVideo } = setup([])
    expect(await uploadRetakeVideo(params, deps)).toEqual({ ok: false, error: 'no_retake' })
    expect(
      await uploadRetakeVideo({ ...params, actor: { userId: 'coach-1', name: '' } }, setup().deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(storeVideo).not.toHaveBeenCalled()
  })
})
