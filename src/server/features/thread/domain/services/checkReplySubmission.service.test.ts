import { describe, expect, it } from 'vitest'
import { checkReplySubmission, requestedDrillIds } from './checkReplySubmission.service'

const MB = 1024 * 1024
const card = { imageBytes: MB, drillId: null }
const base = {
  thread: { status: 'waiting_coach' as const },
  video: { replied: false },
  cards: [card],
  ownDrillIds: [],
}

describe('checkReplySubmission', () => {
  it('返信できる', () => {
    expect(checkReplySubmission(base)).toBeNull()
  })

  it('終了したスレッド・返信済みの動画には返せない', () => {
    expect(checkReplySubmission({ ...base, thread: { status: 'closed' } })).toBe('closed')
    expect(checkReplySubmission({ ...base, video: { replied: true } })).toBe('already_replied')
  })

  it('カードは1〜8枚', () => {
    expect(checkReplySubmission({ ...base, cards: [] })).toBe('no_cards')
    expect(checkReplySubmission({ ...base, cards: Array(9).fill(card) })).toBe('too_many_cards')
    expect(checkReplySubmission({ ...base, cards: Array(8).fill(card) })).toBeNull()
  })

  it('画像は1枚5MBまで', () => {
    expect(checkReplySubmission({ ...base, cards: [{ ...card, imageBytes: 6 * MB }] })).toBe(
      'image_too_large'
    )
  })

  it('付けられるのは自分のドリルだけ', () => {
    const cards = [
      { ...card, drillId: 'd1' },
      { ...card, drillId: 'd2' },
    ]
    expect(checkReplySubmission({ ...base, cards, ownDrillIds: ['d1'] })).toBe('invalid_drill')
    expect(checkReplySubmission({ ...base, cards, ownDrillIds: ['d1', 'd2'] })).toBeNull()
  })
})

describe('requestedDrillIds', () => {
  it('重複を除いて、ドリルを付けたカードだけ', () => {
    expect(
      requestedDrillIds([{ ...card, drillId: 'd1' }, { ...card, drillId: 'd1' }, card])
    ).toEqual(['d1'])
  })
})
