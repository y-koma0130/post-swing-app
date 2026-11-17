import { describe, expect, it } from 'vitest'
import { checkStudentClose } from './checkStudentClose.service'

const submission = (replied: boolean) => ({
  id: crypto.randomUUID(),
  submittedAt: new Date(),
  note: '',
  videos: [{ id: 'v', angle: 'front' as const }],
  replied,
})

describe('checkStudentClose', () => {
  it('レッスン中で、添削待ちの提出がなければ終えられる', () => {
    expect(
      checkStudentClose({ status: 'waiting_student', submissions: [submission(true)] })
    ).toBeNull()
  })

  it('添削を待っているあいだは終えられない', () => {
    expect(checkStudentClose({ status: 'waiting_coach', submissions: [submission(false)] })).toBe(
      'awaiting_reply'
    )
  })

  it('申し込み中・終わったスレッドは終えられない', () => {
    for (const status of ['draft', 'requested', 'closed', 'declined'] as const) {
      expect(checkStudentClose({ status, submissions: [] })).toBe('not_in_lesson')
    }
  })
})
