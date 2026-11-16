import { describe, expect, it } from 'vitest'
import { checkSubmission } from './checkSubmission.service'

const now = new Date('2026-11-14T00:00:00Z')
const base = {
  status: 'waiting_student' as const,
  expiresAt: new Date('2026-12-01T00:00:00Z'),
  planKind: 'single' as const,
  submissions: [],
}
const submission = (replied: boolean) => ({
  id: 's',
  submittedAt: now,
  note: '',
  videos: [{ id: 'v', angle: 'front' as const }],
  replied,
})

describe('checkSubmission', () => {
  it('最初の提出はできる', () => {
    expect(checkSubmission(base, now)).toBeNull()
  })

  it('前の提出に添削が届くまでは次を出せない', () => {
    expect(checkSubmission({ ...base, submissions: [submission(false)] }, now)).toBe(
      'awaiting_reply'
    )
    expect(checkSubmission({ ...base, submissions: [submission(true)] }, now)).toBeNull()
  })

  it('1スレッドは3回まで、お試しは1回まで', () => {
    const three = [submission(true), submission(true), submission(true)]
    expect(checkSubmission({ ...base, submissions: three }, now)).toBe('submission_limit')
    expect(
      checkSubmission({ ...base, planKind: 'trial', submissions: [submission(true)] }, now)
    ).toBe('submission_limit')
  })

  it('期限切れ・終了したスレッドには出せない', () => {
    expect(checkSubmission({ ...base, expiresAt: now }, now)).toBe('expired')
    expect(checkSubmission({ ...base, status: 'closed' }, now)).toBe('closed')
  })
})
