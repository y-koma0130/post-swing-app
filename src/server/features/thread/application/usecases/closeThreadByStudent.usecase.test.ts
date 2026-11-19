import { describe, expect, it, vi } from 'vitest'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { closeThreadByStudent } from './closeThreadByStudent.usecase'

type Deps = Parameters<typeof closeThreadByStudent>[1]
const now = new Date('2026-11-20T00:00:00Z')
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
  requestedAt: null,
  submissions: [
    { id: 's1', submittedAt: now, note: '', videos: [{ id: 'v1', angle: 'front' }], replied: true },
  ],
  messages: [],
}
const student = { userId: 'student-1', name: '佐藤' }

const setup = (t: Thread = thread) => {
  const closeThreads = vi.fn<Deps['closeThreads']>(async () => undefined)
  const notifyThreadClosed = vi.fn<Deps['notifyThreadClosed']>(async () => undefined)
  const deps: Deps = { findThread: async () => t, closeThreads, notifyThreadClosed }
  return { deps, closeThreads, notifyThreadClosed }
}

describe('closeThreadByStudent', () => {
  it('本人の生徒が終えると、レッスンを終了し、レビューのお願いを送る', async () => {
    const { deps, closeThreads, notifyThreadClosed } = setup()
    expect(await closeThreadByStudent({ actor: student, threadId: 'thread-1', now }, deps)).toEqual(
      { ok: true, value: { threadId: 'thread-1' } }
    )
    expect(closeThreads).toHaveBeenCalledWith(['thread-1'], now)
    expect(notifyThreadClosed).toHaveBeenCalledWith({
      threadId: 'thread-1',
      studentUserId: 'student-1',
    })
  })

  it('コーチや他人は終えられない', async () => {
    const { deps, closeThreads } = setup()
    for (const userId of ['coach-1', 'other']) {
      expect(
        await closeThreadByStudent({ actor: { userId, name: '' }, threadId: 'thread-1', now }, deps)
      ).toEqual({ ok: false, error: 'not_found' })
    }
    expect(closeThreads).not.toHaveBeenCalled()
  })

  it('添削を待っているあいだは終えられない', async () => {
    const { deps, closeThreads } = setup({
      ...thread,
      status: 'waiting_coach',
      submissions: [
        {
          ...thread.submissions[0],
          id: 's2',
          replied: false,
          submittedAt: now,
          note: '',
          videos: [],
        },
      ],
    })
    expect(await closeThreadByStudent({ actor: student, threadId: 'thread-1', now }, deps)).toEqual(
      { ok: false, error: 'awaiting_reply' }
    )
    expect(closeThreads).not.toHaveBeenCalled()
  })
})
