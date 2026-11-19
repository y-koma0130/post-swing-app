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
    expect(await run({ ...closedThread, closed: false }).result).toEqual({
      ok: false,
      error: 'not_closed',
    })
  })

  it('1回だけ書ける', async () => {
    expect(await run({ ...closedThread, reviewed: true }).result).toEqual({
      ok: false,
      error: 'already_reviewed',
    })
  })

  it('他人のレッスンには書けない', async () => {
    expect(await run(closedThread, { userId: 'other', name: '' }).result).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})

describe('replyToCoachReview', () => {
  const review = { id: 'r1', coachUserId: 'coach-1', replied: false }
  const reply = (actorId: string, found = review) =>
    replyToCoachReview(
      { actor: { userId: actorId, name: '' }, threadId: 't1', reply: 'ありがとうございます', now },
      { findReviewByThread: async () => found, saveReviewReply: async () => undefined }
    )

  it('担当のコーチは返信できる', async () => {
    expect((await reply('coach-1')).ok).toBe(true)
  })

  it('他のコーチは返信できない', async () => {
    expect(await reply('coach-2')).toEqual({ ok: false, error: 'not_found' })
  })

  it('返信は1回だけ', async () => {
    expect(await reply('coach-1', { ...review, replied: true })).toEqual({
      ok: false,
      error: 'already_replied',
    })
  })
})
