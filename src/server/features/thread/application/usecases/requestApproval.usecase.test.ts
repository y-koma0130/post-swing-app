import { describe, expect, it, vi } from 'vitest'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'
import { requestApproval } from './requestApproval.usecase'

type Deps = Parameters<typeof requestApproval>[1]
const now = new Date('2026-11-20T00:00:00Z')

const setup = (found: { status: ThreadStatus; submissionCount: number } | null) => {
  const markThreadRequested = vi.fn<Deps['markThreadRequested']>(async () => undefined)
  const notifyApplicationReceived = vi.fn<Deps['notifyApplicationReceived']>(async () => undefined)
  const deps: Deps = {
    findThreadByPurchase: async () => (found ? { id: 't1', coachUserId: 'c1', ...found } : null),
    markThreadRequested,
    notifyApplicationReceived,
  }
  return { deps, markThreadRequested, notifyApplicationReceived }
}

describe('requestApproval', () => {
  it('悩みと動画を送った下書きを承認待ちにして、コーチに知らせる', async () => {
    const { deps, markThreadRequested, notifyApplicationReceived } = setup({
      status: 'draft',
      submissionCount: 1,
    })
    expect(await requestApproval({ purchaseId: 'p1', now }, deps)).toEqual({
      ok: true,
      value: { threadId: 't1' },
    })
    expect(markThreadRequested).toHaveBeenCalledWith('t1', now)
    expect(notifyApplicationReceived).toHaveBeenCalledWith({ threadId: 't1', coachUserId: 'c1' })
  })

  it('同じ通知が2回届いても、承認待ちのまま（コーチへの通知は1回）', async () => {
    const { deps, markThreadRequested, notifyApplicationReceived } = setup({
      status: 'requested',
      submissionCount: 1,
    })
    expect((await requestApproval({ purchaseId: 'p1', now }, deps)).ok).toBe(true)
    expect(markThreadRequested).not.toHaveBeenCalled()
    expect(notifyApplicationReceived).not.toHaveBeenCalled()
  })

  it('消えた下書き・動画を送っていない下書き・決まった申し込みは承認待ちにしない', async () => {
    expect(await requestApproval({ purchaseId: 'p1', now }, setup(null).deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    for (const found of [
      { status: 'draft' as const, submissionCount: 0 },
      { status: 'declined' as const, submissionCount: 1 },
      { status: 'waiting_coach' as const, submissionCount: 1 },
    ]) {
      const { deps, markThreadRequested } = setup(found)
      expect(await requestApproval({ purchaseId: 'p1', now }, deps)).toEqual({
        ok: false,
        error: 'not_draft',
      })
      expect(markThreadRequested).not.toHaveBeenCalled()
    }
  })
})
