import { describe, expect, it, vi } from 'vitest'
import { openRetake, retakeThread } from './retakeTestFixtures'
import { submitRetake } from './submitRetake.usecase'

type Deps = Parameters<typeof submitRetake>[1]

const now = new Date('2026-11-12T00:00:00Z')
const draft = (id: string, uploaderUserId = 'student-1') => ({
  id,
  threadId: 'thread-1',
  uploaderUserId,
  submissionId: null,
  chatMessageId: null,
  angle: 'front' as const,
})
const params = {
  actor: { userId: 'student-1', name: '' },
  threadId: 'thread-1',
  requestId: 'req-1',
  videoIds: ['v-2'],
  now,
}

const setup = (requests = [openRetake()], thread = retakeThread()) => {
  const saveRetakeVideos = vi.fn<Deps['saveRetakeVideos']>(async () => undefined)
  const notifyRetakeSent = vi.fn<Deps['notifyRetakeSent']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => thread,
    findRetakeRequests: async () => requests,
    findDraftVideos: async (ids) => ids.map((id) => draft(id)),
    saveRetakeVideos,
    notifyRetakeSent,
  }
  return { deps, saveRetakeVideos, notifyRetakeSent }
}

describe('submitRetake', () => {
  it('撮り直しの動画を元の提出に足し（回数に数えない）、コーチに知らせる', async () => {
    const { deps, saveRetakeVideos, notifyRetakeSent } = setup()
    expect(await submitRetake(params, deps)).toEqual({ ok: true, value: undefined })
    expect(saveRetakeVideos).toHaveBeenCalledWith({
      requestId: 'req-1',
      submissionId: 'sub-1',
      videoIds: ['v-2'],
      sentAt: now,
    })
    expect(notifyRetakeSent).toHaveBeenCalledWith({ threadId: 'thread-1', coachUserId: 'coach-1' })
  })

  it('本人の生徒でなければ送れない', async () => {
    const { deps, saveRetakeVideos } = setup()
    expect(await submitRetake({ ...params, actor: { userId: 'coach-1', name: '' } }, deps)).toEqual(
      { ok: false, error: 'not_found' }
    )
    expect(saveRetakeVideos).not.toHaveBeenCalled()
  })

  it('お願いが終わっていれば送れない', async () => {
    const { deps, saveRetakeVideos } = setup([
      openRetake({ closedAt: now, closeReason: 'replied' }),
    ])
    expect(await submitRetake(params, deps)).toEqual({ ok: false, error: 'no_retake' })
    expect(saveRetakeVideos).not.toHaveBeenCalled()
  })

  it('お願いが開いていても、レッスンが終わっていれば送れない', async () => {
    const { deps, saveRetakeVideos, notifyRetakeSent } = setup(
      [openRetake()],
      retakeThread({ status: 'closed' })
    )
    expect(await submitRetake(params, deps)).toEqual({ ok: false, error: 'no_retake' })
    expect(saveRetakeVideos).not.toHaveBeenCalled()
    expect(notifyRetakeSent).not.toHaveBeenCalled()
  })

  it('動画のルールは提出と同じ（1〜2本、自分が上げた下書きだけ）', async () => {
    const { deps } = setup()
    expect(await submitRetake({ ...params, videoIds: [] }, deps)).toEqual({
      ok: false,
      error: 'no_videos',
    })
    expect(
      await submitRetake(params, { ...deps, findDraftVideos: async () => [draft('v-2', 'other')] })
    ).toEqual({ ok: false, error: 'invalid_video' })
  })
})
