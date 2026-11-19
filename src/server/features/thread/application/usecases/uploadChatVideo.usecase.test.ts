import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { uploadChatVideo } from './uploadChatVideo.usecase'

type Deps = Parameters<typeof uploadChatVideo>[1]
const now = new Date('2026-11-14T00:00:00Z')
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップ',
  status: 'waiting_student',
  startedAt: now,
  expiresAt: new Date('2026-12-14T00:00:00Z'),
  closedAt: null,
  requestedAt: null,
  submissions: [],
  messages: [],
}
const params = {
  actor: { userId: 'coach-1', name: '山田' },
  threadId: 'thread-1',
  contentType: 'video/mp4',
  sizeBytes: 5 * 1024 * 1024,
  durationSec: 12,
  frameRate: 60,
  now,
}
const setup = (t: Thread = thread) => {
  const storeVideo = vi.fn<Deps['storeVideo']>(async () => undefined)
  const saveDraftVideo = vi.fn<Deps['saveDraftVideo']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => t,
    storeVideo,
    saveDraftVideo,
    generateId: () => 'v1',
  }
  return { deps, storeVideo, saveDraftVideo }
}

describe('uploadChatVideo', () => {
  it('担当のコーチは、お手本の動画を下書きとして上げられる', async () => {
    const { deps, saveDraftVideo } = setup()
    expect(await uploadChatVideo(params, deps)).toEqual({ ok: true, value: { videoId: 'v1' } })
    expect(saveDraftVideo.mock.calls[0]?.[0]).toMatchObject({
      uploaderUserId: 'coach-1',
      angle: 'other',
      durationSec: 12,
    })
  })

  it('生徒・ほかのコーチは上げられない', async () => {
    const { deps, storeVideo } = setup()
    expect(
      await uploadChatVideo({ ...params, actor: { userId: 'student-1', name: '' } }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(storeVideo).not.toHaveBeenCalled()
  })

  it('終了したレッスンには上げられず、保存しない', async () => {
    const { deps, storeVideo, saveDraftVideo } = setup({ ...thread, status: 'closed' })
    expect(await uploadChatVideo(params, deps)).toEqual({ ok: false, error: 'closed' })
    expect(storeVideo).not.toHaveBeenCalled()
    expect(saveDraftVideo).not.toHaveBeenCalled()
  })

  it('60秒を超える動画は受け取らず、保存しない', async () => {
    const { deps, storeVideo, saveDraftVideo } = setup()
    expect(await uploadChatVideo({ ...params, durationSec: 61 }, deps)).toEqual({
      ok: false,
      error: 'too_long',
    })
    expect(storeVideo).not.toHaveBeenCalled()
    expect(saveDraftVideo).not.toHaveBeenCalled()
  })

  it.each(['draft', 'requested'] as const)(
    'レッスンが始まる前（%s）は上げられず、保存しない',
    async (status) => {
      const { deps, storeVideo, saveDraftVideo } = setup({ ...thread, status })
      expect(await uploadChatVideo(params, deps)).toEqual({ ok: false, error: 'not_started' })
      expect(storeVideo).not.toHaveBeenCalled()
      expect(saveDraftVideo).not.toHaveBeenCalled()
    }
  )
})
