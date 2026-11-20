import { describe, expect, it, vi } from 'vitest'
import { replyToCoachReview } from './replyToCoachReview.usecase'

type Deps = Parameters<typeof replyToCoachReview>[1]

const now = new Date('2026-11-16T00:00:00Z')
const params = {
  actor: { userId: 'coach-1', name: '' },
  threadId: 't1',
  reply: 'ありがとうございます',
  now,
}

const setup = (review: Awaited<ReturnType<Deps['findReviewByThread']>>) => {
  const saveReviewReply = vi.fn<Deps['saveReviewReply']>(async () => undefined)
  const notifyReviewReplied = vi.fn<Deps['notifyReviewReplied']>(async () => undefined)
  const deps: Deps = {
    findReviewByThread: async () => review,
    saveReviewReply,
    notifyReviewReplied,
  }
  return { deps, saveReviewReply, notifyReviewReplied }
}

describe('replyToCoachReview', () => {
  it('担当のコーチは返信でき、生徒に知らせる', async () => {
    const { deps, saveReviewReply, notifyReviewReplied } = setup({
      id: 'r1',
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      replied: false,
    })
    expect(await replyToCoachReview(params, deps)).toEqual({ ok: true, value: undefined })
    expect(saveReviewReply).toHaveBeenCalledWith('r1', 'ありがとうございます', now)
    expect(notifyReviewReplied).toHaveBeenCalledWith({ threadId: 't1', studentUserId: 'student-1' })
  })

  it('ほかのコーチへのレビューには返信できない', async () => {
    const { deps, saveReviewReply } = setup({
      id: 'r1',
      coachUserId: 'coach-2',
      studentUserId: 'student-1',
      replied: false,
    })
    expect(await replyToCoachReview(params, deps)).toEqual({ ok: false, error: 'not_found' })
    expect(saveReviewReply).not.toHaveBeenCalled()
    expect(deps.notifyReviewReplied).not.toHaveBeenCalled()
  })

  it('返信は1回だけ', async () => {
    const { deps, saveReviewReply } = setup({
      id: 'r1',
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      replied: true,
    })
    expect(await replyToCoachReview(params, deps)).toEqual({
      ok: false,
      error: 'already_replied',
    })
    expect(saveReviewReply).not.toHaveBeenCalled()
  })

  it('レビューがなければ not_found', async () => {
    const { deps, saveReviewReply } = setup(null)
    expect(await replyToCoachReview(params, deps)).toEqual({ ok: false, error: 'not_found' })
    expect(saveReviewReply).not.toHaveBeenCalled()
  })
})
