import { describe, expect, it, vi } from 'vitest'
import { requestRetake } from './requestRetake.usecase'
import { openRetake, retakeThread } from './retakeTestFixtures'

type Deps = Parameters<typeof requestRetake>[1]

const now = new Date('2026-11-12T00:00:00Z')
const params = {
  actor: { userId: 'coach-1', name: '' },
  threadId: 'thread-1',
  submissionId: 'sub-1',
  reason: 'framing',
  message: ' 全身が入るように撮ってください ',
  now,
}

const setup = (requests = [openRetake({ closedAt: now, closeReason: 'resent' })]) => {
  const saveRetakeRequest = vi.fn<Deps['saveRetakeRequest']>(async () => undefined)
  const notifyRetakeRequested = vi.fn<Deps['notifyRetakeRequested']>(async () => undefined)
  const deps: Deps = {
    findThread: async () => retakeThread(),
    findRetakeRequests: async () => requests,
    saveRetakeRequest,
    notifyRetakeRequested,
    generateId: () => 'req-2',
  }
  return { deps, saveRetakeRequest, notifyRetakeRequested }
}

describe('requestRetake', () => {
  it('担当のコーチは、添削待ちの提出に撮り直しをお願いでき、生徒に知らせる', async () => {
    const { deps, saveRetakeRequest, notifyRetakeRequested } = setup()
    expect(await requestRetake(params, deps)).toEqual({ ok: true, value: { requestId: 'req-2' } })
    expect(saveRetakeRequest).toHaveBeenCalledWith({
      id: 'req-2',
      threadId: 'thread-1',
      submissionId: 'sub-1',
      reason: 'framing',
      message: '全身が入るように撮ってください',
      requestedAt: now,
    })
    expect(notifyRetakeRequested).toHaveBeenCalledWith({
      threadId: 'thread-1',
      studentUserId: 'student-1',
    })
  })

  it('担当でないコーチや生徒はお願いできない', async () => {
    const { deps, saveRetakeRequest } = setup()
    for (const userId of ['coach-2', 'student-1']) {
      expect(await requestRetake({ ...params, actor: { userId, name: '' } }, deps)).toEqual({
        ok: false,
        error: 'not_found',
      })
    }
    expect(saveRetakeRequest).not.toHaveBeenCalled()
  })

  it('1つのレッスンで2回まで', async () => {
    const done = openRetake({ closedAt: now, closeReason: 'declined' })
    const { deps } = setup([done, { ...done, id: 'req-0' }])
    expect(await requestRetake(params, deps)).toEqual({ ok: false, error: 'retake_limit' })
  })

  it('理由が選択肢になければ受け付けない', async () => {
    const { deps } = setup()
    expect(await requestRetake({ ...params, reason: 'unknown' }, deps)).toEqual({
      ok: false,
      error: 'invalid_reason',
    })
  })
})
