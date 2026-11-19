import { describe, expect, it } from 'vitest'
import { coachReviewInputSchema, coachReviewReplySchema } from './CoachReview'

const review = (input: { rating?: number; comment?: string }) =>
  coachReviewInputSchema.safeParse({ rating: 5, comment: '', ...input }).success

describe('coachReviewInputSchema', () => {
  it('星は1〜5の整数', () => {
    expect(review({ rating: 0 })).toBe(false)
    expect(review({ rating: 1 })).toBe(true)
    expect(review({ rating: 5 })).toBe(true)
    expect(review({ rating: 6 })).toBe(false)
    expect(review({ rating: 4.5 })).toBe(false)
  })

  it('コメントは任意で、1000文字まで（前後の空白は数えない）', () => {
    expect(review({ comment: '' })).toBe(true)
    expect(review({ comment: 'あ'.repeat(1000) })).toBe(true)
    expect(review({ comment: ` ${'あ'.repeat(1000)} ` })).toBe(true)
    expect(review({ comment: 'あ'.repeat(1001) })).toBe(false)
  })
})

describe('coachReviewReplySchema', () => {
  it('前後の空白を取る', () => {
    expect(coachReviewReplySchema.parse('  ありがとうございます  ')).toBe('ありがとうございます')
  })

  it('空・空白だけの返信は受け付けない', () => {
    expect(coachReviewReplySchema.safeParse('').success).toBe(false)
    expect(coachReviewReplySchema.safeParse('   ').success).toBe(false)
  })

  it('1000文字まで', () => {
    expect(coachReviewReplySchema.safeParse('あ'.repeat(1000)).success).toBe(true)
    expect(coachReviewReplySchema.safeParse('あ'.repeat(1001)).success).toBe(false)
  })
})
