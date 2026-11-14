import { describe, expect, it } from 'vitest'
import type { ThreadDetailDto } from '../dto/ThreadDetail.dto'
import { authorizeVideo } from './authorizeVideo.usecase'
import { viewThread } from './viewThread.usecase'

const detail: ThreadDetailDto = {
  id: 'thread-1',
  coachName: '山田',
  coachSlug: 'yamada',
  studentName: '佐藤',
  planKind: 'single',
  theme: '',
  status: 'waiting_student',
  startedAt: new Date(),
  expiresAt: new Date(),
  maxVideos: 3,
  maxVideoBytes: 100,
  videoSubmissionBlocker: null,
  review: null,
  videos: [],
}
const members = { coachUserId: 'coach-1', studentUserId: 'student-1' }
const deps = {
  findThreadDetail: async () => ({ detail, members }),
}

describe('viewThread', () => {
  it('本人の生徒は生徒として見られる', async () => {
    const result = await viewThread(
      { actor: { userId: 'student-1', name: '' }, threadId: 'thread-1', as: 'student' },
      deps
    )
    expect(result.ok).toBe(true)
  })

  it('担当のコーチはコーチとして見られる', async () => {
    const result = await viewThread(
      { actor: { userId: 'coach-1', name: '' }, threadId: 'thread-1', as: 'coach' },
      deps
    )
    expect(result.ok).toBe(true)
  })

  it('他人には存在しないと返す', async () => {
    const result = await viewThread(
      { actor: { userId: 'other', name: '' }, threadId: 'thread-1', as: 'student' },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('コーチが生徒の立場では見られない', async () => {
    const result = await viewThread(
      { actor: { userId: 'coach-1', name: '' }, threadId: 'thread-1', as: 'student' },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('authorizeVideo', () => {
  const stored = { r2Key: 'videos/t/v', contentType: 'video/mp4', deleted: false, members }
  const run = (userId: string, video = stored) =>
    authorizeVideo(
      { actor: { userId, name: '' }, videoId: 'v' },
      { findStoredVideo: async () => video }
    )

  it('コーチと生徒は見られる', async () => {
    expect((await run('coach-1')).ok).toBe(true)
    expect((await run('student-1')).ok).toBe(true)
  })

  it('他人は見られない', async () => {
    expect(await run('other')).toEqual({ ok: false, error: 'not_found' })
  })

  it('削除済みの動画は見られない', async () => {
    expect(await run('student-1', { ...stored, deleted: true })).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})
