import { describe, expect, it } from 'vitest'
import { checkReplySubmission } from './checkReplySubmission.service'

const MB = 1024 * 1024
const card = { imageBytes: MB, videoId: 'v1' }
const base = {
  thread: { status: 'waiting_coach' as const },
  submission: {
    replied: false,
    videos: [
      { id: 'v1', angle: 'front' as const },
      { id: 'v2', angle: 'back' as const },
    ],
  },
  cards: [card],
  comment: 'トップで右ひざを保ちましょう',
  drillIds: [],
  ownDrillIds: [],
}

describe('checkReplySubmission', () => {
  it('返せる', () => {
    expect(checkReplySubmission(base)).toBeNull()
  })

  it('終了したレッスン・添削済みの提出には返せない', () => {
    expect(checkReplySubmission({ ...base, thread: { status: 'closed' } })).toBe('closed')
    expect(
      checkReplySubmission({ ...base, submission: { ...base.submission, replied: true } })
    ).toBe('already_replied')
  })

  it('画像は1〜8枚、1枚5MBまで', () => {
    expect(checkReplySubmission({ ...base, cards: [] })).toBe('no_cards')
    expect(checkReplySubmission({ ...base, cards: Array(9).fill(card) })).toBe('too_many_cards')
    expect(checkReplySubmission({ ...base, cards: Array(8).fill(card) })).toBeNull()
    expect(checkReplySubmission({ ...base, cards: [{ ...card, imageBytes: 6 * MB }] })).toBe(
      'image_too_large'
    )
  })

  it('画像は、その提出のどちらの動画からも作れる。ほかの動画からは作れない', () => {
    expect(checkReplySubmission({ ...base, cards: [card, { ...card, videoId: 'v2' }] })).toBeNull()
    expect(checkReplySubmission({ ...base, cards: [{ ...card, videoId: 'x' }] })).toBe(
      'invalid_video'
    )
  })

  it('説明は必ず書く。2000文字まで', () => {
    expect(checkReplySubmission({ ...base, comment: '  ' })).toBe('comment_required')
    expect(checkReplySubmission({ ...base, comment: 'あ'.repeat(2001) })).toBe('comment_too_long')
  })

  it('ドリルは自分のもので3つまで', () => {
    const own = ['d1', 'd2', 'd3', 'd4']
    expect(
      checkReplySubmission({ ...base, drillIds: ['d1', 'd2', 'd3'], ownDrillIds: own })
    ).toBeNull()
    expect(
      checkReplySubmission({ ...base, drillIds: ['d1', 'd2', 'd3', 'd4'], ownDrillIds: own })
    ).toBe('too_many_drills')
    expect(checkReplySubmission({ ...base, drillIds: ['x'], ownDrillIds: own })).toBe(
      'invalid_drill'
    )
  })

  it('申し込みは、承認するまで返せない。断ったら終了と同じ', () => {
    expect(checkReplySubmission({ ...base, thread: { status: 'requested' } })).toBe('not_started')
    expect(checkReplySubmission({ ...base, thread: { status: 'declined' } })).toBe('closed')
  })
})
