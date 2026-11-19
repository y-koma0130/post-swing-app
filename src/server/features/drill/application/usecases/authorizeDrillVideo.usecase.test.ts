import { describe, expect, it } from 'vitest'
import { authorizeDrillVideo } from './authorizeDrillVideo.usecase'

type Deps = Parameters<typeof authorizeDrillVideo>[1]

const video = { r2Key: 'drill-videos/coach-1/v1', contentType: 'video/mp4', coachUserId: 'coach-1' }

const deps = (received: boolean, found = true): Deps => ({
  findDrillVideo: async () => (found ? video : null),
  hasReceivedDrillVideo: async () => received,
})

const as = (userId: string) => ({ actor: { userId, name: '' }, videoId: 'v1' })

describe('authorizeDrillVideo', () => {
  it('上げたコーチ本人は見られる', async () => {
    expect(await authorizeDrillVideo(as('coach-1'), deps(false))).toEqual({
      ok: true,
      value: { r2Key: video.r2Key, contentType: 'video/mp4' },
    })
  })

  it('そのドリルを受け取った生徒は見られる', async () => {
    expect((await authorizeDrillVideo(as('student-1'), deps(true))).ok).toBe(true)
  })

  it('受け取っていない人やほかのコーチは見られない', async () => {
    expect(await authorizeDrillVideo(as('student-2'), deps(false))).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(await authorizeDrillVideo(as('coach-2'), deps(false))).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('動画がなければ not_found', async () => {
    expect(await authorizeDrillVideo(as('coach-1'), deps(true, false))).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
