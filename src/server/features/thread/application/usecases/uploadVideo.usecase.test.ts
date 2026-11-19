import { describe, expect, it, vi } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { uploadVideo } from './uploadVideo.usecase'

type Deps = Parameters<typeof uploadVideo>[1]

const now = new Date('2026-11-14T00:00:00Z')
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: '',
  status: 'waiting_student',
  startedAt: now,
  expiresAt: new Date('2026-12-14T00:00:00Z'),
  closedAt: null,
  requestedAt: null,
  submissions: [],
  messages: [],
}
const params = {
  actor: { userId: 'student-1', name: '佐藤' },
  threadId: 'thread-1',
  contentType: 'video/quicktime',
  sizeBytes: 20 * 1024 * 1024,
  angle: 'front',
  durationSec: 8.2,
  frameRate: 119.88,
  now,
}

const setup = (t: Thread | null = thread) => {
  const storeVideo = vi.fn<Deps['storeVideo']>(async () => undefined)
  const saveDraftVideo = vi.fn<Deps['saveDraftVideo']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => t,
    findCoachAvailabilityFacts: async () => ({ absences: [], delayFlagSetAt: null }),
    storeVideo,
    saveDraftVideo,
    generateId: () => 'video-1',
  }
  return { deps, storeVideo, saveDraftVideo }
}

describe('uploadVideo', () => {
  it('下書きとして保存する（レッスンの状態は変えない）', async () => {
    const { deps, storeVideo, saveDraftVideo } = setup()
    expect(await uploadVideo(params, deps)).toEqual({ ok: true, value: { videoId: 'video-1' } })
    expect(storeVideo).toHaveBeenCalledWith('videos/thread-1/video-1', 'video/quicktime')
    expect(saveDraftVideo.mock.calls[0]?.[0]).toMatchObject({
      id: 'video-1',
      threadId: 'thread-1',
      uploaderUserId: 'student-1',
      angle: 'front',
      durationSec: 8.2,
      frameRate: 119.88,
    })
  })

  it('本人の生徒でなければ上げられない', async () => {
    const { deps, storeVideo } = setup()
    expect(await uploadVideo({ ...params, actor: { userId: 'coach-1', name: '' } }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('提出できない状態なら、受け取る前に止める', async () => {
    const replied = {
      id: 's',
      submittedAt: now,
      note: '',
      videos: [{ id: 'v', angle: 'front' as const }],
      replied: false,
    }
    const { deps, storeVideo } = setup({ ...thread, submissions: [replied] })
    expect(await uploadVideo(params, deps)).toEqual({ ok: false, error: 'awaiting_reply' })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('60秒を超える動画・角度のない動画は受け取らない', async () => {
    const { deps, storeVideo } = setup()
    expect(await uploadVideo({ ...params, durationSec: 75 }, deps)).toEqual({
      ok: false,
      error: 'too_long',
    })
    expect(await uploadVideo({ ...params, angle: '' }, deps)).toEqual({
      ok: false,
      error: 'invalid_angle',
    })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('保存した期限を過ぎていても、不在で延びた期限の中なら上げられる', async () => {
    const absence = {
      id: 'absence-1',
      coachUserId: 'coach-1',
      startDate: localDateSchema.parse('2026-11-20'),
      endDate: localDateSchema.parse('2026-11-23'),
      note: '',
      pauseNewSignups: false,
    }
    const deps: Deps = {
      ...setup().deps,
      findCoachAvailabilityFacts: async () => ({ absences: [absence], delayFlagSetAt: null }),
    }
    const later = new Date('2026-12-15T00:00:00Z')
    expect((await uploadVideo({ ...params, now: later }, deps)).ok).toBe(true)
  })
})
