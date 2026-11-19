import { describe, expect, it } from 'vitest'
import { authorizeVideo, type StoredVideo } from './authorizeVideo.usecase'

const stored: StoredVideo = {
  r2Key: 'videos/t1/v1',
  contentType: 'video/mp4',
  deleted: false,
  draft: false,
  members: { coachUserId: 'coach-1', studentUserId: 'student-1' },
}

const deps = (video: StoredVideo | null = stored) => ({ findStoredVideo: async () => video })

describe('authorizeVideo', () => {
  it('本人の生徒は見られる', async () => {
    expect(
      await authorizeVideo({ actor: { userId: 'student-1', name: '' }, videoId: 'v1' }, deps())
    ).toEqual({ ok: true, value: { r2Key: 'videos/t1/v1', contentType: 'video/mp4' } })
  })

  it('担当のコーチは見られる', async () => {
    expect(
      await authorizeVideo({ actor: { userId: 'coach-1', name: '' }, videoId: 'v1' }, deps())
    ).toEqual({ ok: true, value: { r2Key: 'videos/t1/v1', contentType: 'video/mp4' } })
  })

  it('ほかの人には、ないものとして返す', async () => {
    expect(
      await authorizeVideo({ actor: { userId: 'someone', name: '' }, videoId: 'v1' }, deps())
    ).toEqual({ ok: false, error: 'not_found' })
  })

  it('保存期間を過ぎて消した動画は、本人でも見られない', async () => {
    expect(
      await authorizeVideo(
        { actor: { userId: 'student-1', name: '' }, videoId: 'v1' },
        deps({ ...stored, deleted: true })
      )
    ).toEqual({ ok: false, error: 'not_found' })
  })

  it('提出前の下書きは、上げた生徒だけが見られる（コーチにも見せない）', async () => {
    const draft = deps({ ...stored, draft: true })
    expect(
      (await authorizeVideo({ actor: { userId: 'student-1', name: '' }, videoId: 'v1' }, draft)).ok
    ).toBe(true)
    expect(
      await authorizeVideo({ actor: { userId: 'coach-1', name: '' }, videoId: 'v1' }, draft)
    ).toEqual({ ok: false, error: 'not_found' })
  })

  it('ない動画は not_found', async () => {
    expect(
      await authorizeVideo({ actor: { userId: 'student-1', name: '' }, videoId: 'x' }, deps(null))
    ).toEqual({ ok: false, error: 'not_found' })
  })
})
