import { describe, expect, it } from 'vitest'
import type { ThreadDetailDto } from '../dto/ThreadDetail.dto'
import { authorizeVideo } from './authorizeVideo.usecase'
import { viewThread } from './viewThread.usecase'

const detail: ThreadDetailDto = {
  id: 'thread-1',
  coachName: '山田',
  coachSlug: 'yamada',
  coachAvatarUrl: null,
  studentName: '佐藤',
  planKind: 'single',
  theme: '',
  golfProfile: { ageRange: '40s', roundFrequency: null, averageScore: null },
  retake: { requests: [], remaining: 2 },
  status: 'waiting_student',
  startedAt: new Date(),
  expiresAt: new Date(),
  extendedDays: 0,
  application: {
    approvalDeadline: null,
    decline: null,
    checkout: null,
    monitor: false,
    free: false,
  },
  shareConsent: null,
  coachAvailability: { kind: 'available', replyTargetHours: 48 },
  sendGuard: { video: 'none', chat: 'none' },
  limits: {
    maxSubmissions: 3,
    maxVideosPerSubmission: 2,
    maxVideoBytes: 100,
    maxVideoSeconds: 60,
    maxStudentMessages: 30,
  },
  submissionBlocker: null,
  remainingStudentMessages: 30,
  studentChatBlocker: 'no_submission',
  studentCloseBlocker: 'not_in_lesson',
  lastReadAt: { coach: null, student: null },
  review: null,
  submissions: [],
  messages: [],
  notices: [],
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
    expect(result).toEqual({ ok: true, value: detail })
  })

  it('担当のコーチはコーチとして見られる', async () => {
    const result = await viewThread(
      { actor: { userId: 'coach-1', name: '' }, threadId: 'thread-1', as: 'coach' },
      deps
    )
    expect(result).toEqual({ ok: true, value: detail })
  })

  it('申し込みの下書きは、担当のコーチにも存在しないと返す（本人の生徒は見られる）', async () => {
    const draftDeps = {
      findThreadDetail: async () => ({ detail: { ...detail, status: 'draft' as const }, members }),
    }
    expect(
      await viewThread(
        { actor: { userId: 'coach-1', name: '' }, threadId: 'thread-1', as: 'coach' },
        draftDeps
      )
    ).toEqual({ ok: false, error: 'not_found' })
    expect(
      (
        await viewThread(
          { actor: { userId: 'student-1', name: '' }, threadId: 'thread-1', as: 'student' },
          draftDeps
        )
      ).ok
    ).toBe(true)
  })

  it('他人には存在しないと返す', async () => {
    const result = await viewThread(
      { actor: { userId: 'other', name: '' }, threadId: 'thread-1', as: 'student' },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('生徒がコーチの立場では見られない', async () => {
    const result = await viewThread(
      { actor: { userId: 'student-1', name: '' }, threadId: 'thread-1', as: 'coach' },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('ないスレッドは not_found', async () => {
    const result = await viewThread(
      { actor: { userId: 'student-1', name: '' }, threadId: 'x', as: 'student' },
      { findThreadDetail: async () => null }
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
  const stored = {
    r2Key: 'videos/t/v',
    contentType: 'video/mp4',
    deleted: false,
    draft: false,
    members,
  }
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
