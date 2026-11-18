import { describe, expect, it } from 'vitest'
import { checkReviewReply } from './checkReviewReply.service'
import { checkReviewSubmission } from './checkReviewSubmission.service'

describe('checkReviewSubmission', () => {
  it('終わったスレッドに1回だけ書ける', () => {
    expect(checkReviewSubmission({ closed: true, reviewed: false })).toBeNull()
    expect(checkReviewSubmission({ closed: false, reviewed: false })).toBe('not_closed')
    expect(checkReviewSubmission({ closed: true, reviewed: true })).toBe('already_reviewed')
  })
})

describe('checkReviewReply', () => {
  it('返信は1回だけ', () => {
    expect(checkReviewReply({ replied: false })).toBeNull()
    expect(checkReviewReply({ replied: true })).toBe('already_replied')
  })
})
