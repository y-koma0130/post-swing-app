import { describe, expect, it, vi } from 'vitest'
import { declineRetake } from './declineRetake.usecase'
import { openRetake, retakeThread } from './retakeTestFixtures'

type Deps = Parameters<typeof declineRetake>[1]

const now = new Date('2026-11-12T00:00:00Z')
const params = {
  actor: { userId: 'student-1', name: '' },
  threadId: 'thread-1',
  requestId: 'req-1',
  now,
}

const setup = (requests = [openRetake()], thread = retakeThread()) => {
  const closeRetakeRequest = vi.fn<Deps['closeRetakeRequest']>(async () => undefined)
  const notifyRetakeDeclined = vi.fn<Deps['notifyRetakeDeclined']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => thread,
    findRetakeRequests: async () => requests,
    closeRetakeRequest,
    notifyRetakeDeclined,
  }
  return { deps, closeRetakeRequest, notifyRetakeDeclined }
}

describe('declineRetake', () => {
  it('生徒が「今は撮れない」と返すと、お願いを終えてコーチに知らせる', async () => {
    const { deps, closeRetakeRequest, notifyRetakeDeclined } = setup()
    expect(await declineRetake(params, deps)).toEqual({ ok: true, value: undefined })
    expect(closeRetakeRequest).toHaveBeenCalledWith({ requestId: 'req-1', closedAt: now })
    expect(notifyRetakeDeclined).toHaveBeenCalledWith({
      threadId: 'thread-1',
      coachUserId: 'coach-1',
    })
  })

  it('本人の生徒でなければ not_found で、お願いを終えない', async () => {
    const { deps, closeRetakeRequest, notifyRetakeDeclined } = setup()
    expect(
      await declineRetake({ ...params, actor: { userId: 'coach-1', name: '' } }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(closeRetakeRequest).not.toHaveBeenCalled()
    expect(notifyRetakeDeclined).not.toHaveBeenCalled()
  })

  it('終わったお願いには返せない', async () => {
    const { deps, closeRetakeRequest, notifyRetakeDeclined } = setup([
      openRetake({ closedAt: now, closeReason: 'resent' }),
    ])
    expect(await declineRetake(params, deps)).toEqual({ ok: false, error: 'no_retake' })
    expect(closeRetakeRequest).not.toHaveBeenCalled()
    expect(notifyRetakeDeclined).not.toHaveBeenCalled()
  })

  it('ないお願いには返せない', async () => {
    const { deps, closeRetakeRequest } = setup()
    expect(await declineRetake({ ...params, requestId: 'unknown' }, deps)).toEqual({
      ok: false,
      error: 'no_retake',
    })
    expect(closeRetakeRequest).not.toHaveBeenCalled()
  })

  it('終わったレッスン・返金したレッスンのお願いには返せない', async () => {
    const { deps, closeRetakeRequest, notifyRetakeDeclined } = setup(
      [openRetake()],
      retakeThread({ status: 'closed' })
    )
    expect(await declineRetake(params, deps)).toEqual({ ok: false, error: 'no_retake' })
    expect(closeRetakeRequest).not.toHaveBeenCalled()
    expect(notifyRetakeDeclined).not.toHaveBeenCalled()
  })
})
