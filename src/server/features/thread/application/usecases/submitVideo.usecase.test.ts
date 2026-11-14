import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { submitVideo } from './submitVideo.usecase'

type Deps = Parameters<typeof submitVideo>[1]

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
  videos: [],
  messages: [],
}
const params = {
  actor: { userId: 'student-1', name: '佐藤' },
  threadId: 'thread-1',
  theme: 'トップで右ひざが流れる',
  note: 'ドライバーです',
  contentType: 'video/quicktime',
  sizeBytes: 20 * 1024 * 1024,
  now,
}

const setup = (t: Thread | null = thread) => {
  const storeVideo = vi.fn<Deps['storeVideo']>(async () => undefined)
  const saveVideo = vi.fn<Deps['saveVideo']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => t,
    storeVideo,
    saveVideo,
    generateId: () => 'video-1',
  }
  return { deps, storeVideo, saveVideo }
}

describe('submitVideo', () => {
  it('最初の動画はテーマと一緒に保存する', async () => {
    const { deps, storeVideo, saveVideo } = setup()
    expect(await submitVideo(params, deps)).toEqual({ ok: true, value: { videoId: 'video-1' } })
    expect(storeVideo).toHaveBeenCalledWith('videos/thread-1/video-1', 'video/quicktime')
    expect(saveVideo.mock.calls[0]?.[0]).toMatchObject({
      theme: 'トップで右ひざが流れる',
      note: 'ドライバーです',
    })
  })

  it('2本目以降はテーマを変えない', async () => {
    const { deps, saveVideo } = setup({
      ...thread,
      theme: '最初のテーマ',
      videos: [{ id: 'v0', uploadedAt: now, note: '', replied: true }],
    })
    await submitVideo({ ...params, theme: '' }, deps)
    expect(saveVideo.mock.calls[0]?.[0].theme).toBeNull()
  })

  it('他人のスレッドには送れない（保存もしない）', async () => {
    const { deps, storeVideo } = setup()
    const result = await submitVideo({ ...params, actor: { userId: 'other', name: '他人' } }, deps)
    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('最初の動画でテーマが空なら送れない', async () => {
    const { deps } = setup()
    expect(await submitVideo({ ...params, theme: '  ' }, deps)).toEqual({
      ok: false,
      error: 'theme_required',
    })
  })

  it('動画以外のファイルは送れない', async () => {
    const { deps } = setup()
    expect(await submitVideo({ ...params, contentType: 'image/png' }, deps)).toEqual({
      ok: false,
      error: 'unsupported_type',
    })
  })

  it('100MBを超えると送れない', async () => {
    const { deps } = setup()
    expect(await submitVideo({ ...params, sizeBytes: 101 * 1024 * 1024 }, deps)).toEqual({
      ok: false,
      error: 'too_large',
    })
  })

  it('前の動画に返信がないと送れない', async () => {
    const { deps } = setup({
      ...thread,
      videos: [{ id: 'v0', uploadedAt: now, note: '', replied: false }],
    })
    expect(await submitVideo(params, deps)).toEqual({ ok: false, error: 'awaiting_reply' })
  })
})
