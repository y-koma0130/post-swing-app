import { describe, expect, it, vi } from 'vitest'
import { replyToCoachReview } from './replyToCoachReview.usecase'
import { submitCoachReview } from './submitCoachReview.usecase'

type Deps = Parameters<typeof submitCoachReview>[1]
const now = new Date('2026-12-20T00:00:00Z')
const student = { userId: 'student-1', name: '佐藤' }
const closedThread = {
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  closed: true,
  reviewed: false,
}

const run = (thread: Awaited<ReturnType<Deps['findThreadForReview']>>, actor = student) => {
  const saveReview = vi.fn<Deps['saveReview']>(async () => undefined)
  const result = submitCoachReview(
    { actor, threadId: 't1', review: { rating: 5, comment: 'わかりやすかったです' }, now },
    { findThreadForReview: async () => thread, saveReview, generateId: () => 'r1' }
  )
  return { result, saveReview }
}

describe('submitCoachReview', () => {
  it('終わったレッスンの生徒はレビューを書ける', async () => {
    const { result, saveReview } = run(closedThread)
    expect(await result).toEqual({ ok: true, value: undefined })
    expect(saveReview.mock.calls[0]?.[0]).toMatchObject({ rating: 5, coachUserId: 'coach-1' })
  })

  it('終わる前は書けない', async () => {
    const { result, saveReview } = run({ ...closedThread, closed: false })
    expect(await result).toEqual({ ok: false, error: 'not_closed' })
    expect(saveReview).not.toHaveBeenCalled()
  })

  it('1回だけ書ける', async () => {
    const { result, saveReview } = run({ ...closedThread, reviewed: true })
    expect(await result).toEqual({ ok: false, error: 'already_reviewed' })
    expect(saveReview).not.toHaveBeenCalled()
  })

  it('他人のレッスンには書けない', async () => {
    const { result, saveReview } = run(closedThread, { userId: 'other', name: '' })
    expect(await result).toEqual({ ok: false, error: 'not_found' })
    expect(saveReview).not.toHaveBeenCalled()
  })
})

describe('replyToCoachReview', () => {
  type ReplyDeps = Parameters<typeof replyToCoachReview>[1]
  const review = { id: 'r1', coachUserId: 'coach-1', replied: false }
  const reply = (actorId: string, found = review) => {
    const saveReviewReply = vi.fn<ReplyDeps['saveReviewReply']>(async () => undefined)
    const result = replyToCoachReview(
      { actor: { userId: actorId, name: '' }, threadId: 't1', reply: 'ありがとうございます', now },
      { findReviewByThread: async () => found, saveReviewReply }
    )
    return { result, saveReviewReply }
  }

  it('担当のコーチは返信できる', async () => {
    const { result, saveReviewReply } = reply('coach-1')
    expect((await result).ok).toBe(true)
    expect(saveReviewReply).toHaveBeenCalledWith('r1', 'ありがとうございます', now)
  })

  it('他のコーチは返信できず、保存しない', async () => {
    const { result, saveReviewReply } = reply('coach-2')
    expect(await result).toEqual({ ok: false, error: 'not_found' })
    expect(saveReviewReply).not.toHaveBeenCalled()
  })

  it('返信は1回だけ。2回目は保存しない', async () => {
    const { result, saveReviewReply } = reply('coach-1', { ...review, replied: true })
    expect(await result).toEqual({ ok: false, error: 'already_replied' })
    expect(saveReviewReply).not.toHaveBeenCalled()
  })
})
