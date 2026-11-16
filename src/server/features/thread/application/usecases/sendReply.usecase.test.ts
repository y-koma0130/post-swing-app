import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { sendReply } from './sendReply.usecase'

type Deps = Parameters<typeof sendReply>[1]
const now = new Date('2026-11-20T00:00:00Z')
const submission = (id: string, replied: boolean) => ({
  id,
  submittedAt: now,
  note: '',
  videos: [
    { id: `${id}-front`, angle: 'front' as const },
    { id: `${id}-back`, angle: 'back' as const },
  ],
  replied,
})

const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップ',
  status: 'waiting_coach',
  startedAt: now,
  expiresAt: new Date('2026-12-20T00:00:00Z'),
  closedAt: null,
  submissions: [submission('s1', false)],
  messages: [],
}
const card = {
  position: 'top' as const,
  timeSec: 1.2,
  annotations: [],
  comment: '右ひざの角度を保ちましょう',
  drillId: null,
  imageBytes: 200_000,
  videoId: 's1-front',
}
const params = {
  actor: { userId: 'coach-1', name: '山田' },
  threadId: 'thread-1',
  submissionId: 's1',
  cards: [card],
  now,
}

const setup = (t: Thread = thread, ownDrills: string[] = []) => {
  const saveReply = vi.fn<Deps['saveReply']>(async () => undefined)
  const storeCardImage = vi.fn<Deps['storeCardImage']>(async () => undefined)
  const notifyReplySent = vi.fn<Deps['notifyReplySent']>(async () => undefined)
  let n = 0
  const deps: Deps = {
    findThread: async () => t,
    findOwnDrillIds: async () => ownDrills,
    storeCardImage,
    saveReply,
    notifyReplySent,
    generateId: () => `id-${++n}`,
  }
  return { deps, saveReply, storeCardImage, notifyReplySent }
}

describe('sendReply', () => {
  it('正面と後方のカードをまとめて保存し、生徒の番にして、生徒に知らせる', async () => {
    const { deps, saveReply, storeCardImage, notifyReplySent } = setup()
    const back = { ...card, videoId: 's1-back' }
    const result = await sendReply({ ...params, cards: [card, back] }, deps)
    expect(result.ok).toBe(true)
    expect(storeCardImage).toHaveBeenCalledTimes(2)
    expect(saveReply.mock.calls[0]?.[0]).toMatchObject({
      submissionId: 's1',
      nextStatus: 'waiting_student',
      cards: [
        { sortOrder: 0, position: 'top', comment: card.comment, videoId: 's1-front' },
        { sortOrder: 1, videoId: 's1-back' },
      ],
    })
    expect(notifyReplySent).toHaveBeenCalledWith({
      threadId: 'thread-1',
      studentUserId: 'student-1',
    })
  })

  it('担当でないコーチは返信できない', async () => {
    const { deps, saveReply } = setup()
    const result = await sendReply({ ...params, actor: { userId: 'other', name: '' } }, deps)
    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(saveReply).not.toHaveBeenCalled()
  })

  it('添削済みの提出には返せない', async () => {
    const { deps } = setup({ ...thread, submissions: [submission('s1', true)] })
    expect(await sendReply(params, deps)).toEqual({ ok: false, error: 'already_replied' })
  })

  it('ほかの提出の動画から作ったカードは送れない', async () => {
    const { deps } = setup()
    const result = await sendReply({ ...params, cards: [{ ...card, videoId: 'x' }] }, deps)
    expect(result).toEqual({ ok: false, error: 'invalid_video' })
  })

  it('カードがなければ送れない', async () => {
    const { deps } = setup()
    expect(await sendReply({ ...params, cards: [] }, deps)).toEqual({
      ok: false,
      error: 'no_cards',
    })
  })

  it('他のコーチのドリルは付けられない', async () => {
    const { deps } = setup(thread, [])
    const result = await sendReply({ ...params, cards: [{ ...card, drillId: 'drill-x' }] }, deps)
    expect(result).toEqual({ ok: false, error: 'invalid_drill' })
  })

  it('期限が過ぎていても、終了していなければ返信できる', async () => {
    const { deps } = setup({ ...thread, expiresAt: new Date('2026-11-01T00:00:00Z') })
    expect((await sendReply(params, deps)).ok).toBe(true)
  })

  it('添削していない提出が残っていれば、コーチの番のまま', async () => {
    const { deps, saveReply } = setup({
      ...thread,
      submissions: [submission('s1', false), submission('s2', false)],
    })
    await sendReply(params, deps)
    expect(saveReply.mock.calls[0]?.[0].nextStatus).toBe('waiting_coach')
  })
})
