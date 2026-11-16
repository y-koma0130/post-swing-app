import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { sendChatMessage } from './sendChatMessage.usecase'

type Deps = Parameters<typeof sendChatMessage>[1]
const now = new Date('2026-11-20T00:00:00Z')
const message = (from: 'coach' | 'student') => ({
  id: crypto.randomUUID(),
  videoId: 'v1',
  from,
  body: 'テスト',
  sentAt: now,
})
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップ',
  status: 'waiting_student',
  startedAt: now,
  expiresAt: new Date('2026-12-20T00:00:00Z'),
  closedAt: null,
  videos: [{ id: 'v1', uploadedAt: now, note: '', replied: true }],
  messages: [],
}
const student = { userId: 'student-1', name: '佐藤' }
const coach = { userId: 'coach-1', name: '山田' }

const setup = (t: Thread = thread) => {
  const saveChatMessage = vi.fn<Deps['saveChatMessage']>(async () => undefined)
  const notifyChatMessage = vi.fn<Deps['notifyChatMessage']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => t,
    saveChatMessage,
    notifyChatMessage,
    generateId: () => 'm-1',
  }
  return { deps, saveChatMessage, notifyChatMessage }
}
const send = (actor: typeof student, deps: Deps, body = '質問です') =>
  sendChatMessage({ actor, threadId: 'thread-1', videoId: 'v1', body, now }, deps)

describe('sendChatMessage', () => {
  it('生徒が送るとコーチの番になり、コーチに知らせる', async () => {
    const { deps, saveChatMessage, notifyChatMessage } = setup()
    expect((await send(student, deps)).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0]).toMatchObject({
      senderRole: 'student',
      nextStatus: 'waiting_coach',
    })
    expect(notifyChatMessage).toHaveBeenCalledWith({
      threadId: 'thread-1',
      to: 'coach',
      recipientUserId: 'coach-1',
    })
  })

  it('生徒は動画1本につき3通まで', async () => {
    const { deps } = setup({ ...thread, messages: [1, 2, 3].map(() => message('student')) })
    expect(await send(student, deps)).toEqual({ ok: false, error: 'limit_reached' })
  })

  it('コーチは何通でも送れ、生徒の番になる', async () => {
    const { deps, saveChatMessage } = setup({
      ...thread,
      status: 'waiting_coach',
      messages: [1, 2, 3, 4, 5].map(() => message('coach')),
    })
    expect((await send(coach, deps)).ok).toBe(true)
    expect(saveChatMessage.mock.calls[0]?.[0].nextStatus).toBe('waiting_student')
  })

  it('当事者でなければ送れない', async () => {
    const { deps } = setup()
    expect(await send({ userId: 'other', name: '' }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('空のメッセージは送れない', async () => {
    const { deps } = setup()
    expect(await send(student, deps, '   ')).toEqual({ ok: false, error: 'empty' })
  })

  it('終了したスレッドには送れない', async () => {
    const { deps } = setup({ ...thread, status: 'closed' })
    expect(await send(student, deps)).toEqual({ ok: false, error: 'closed' })
  })
})
