import { describe, expect, it } from 'vitest'
import { nextStatusAfter } from './nextStatusAfter.service'

const submission = (replied: boolean) => ({
  id: crypto.randomUUID(),
  submittedAt: new Date(),
  note: '',
  videos: [{ id: 'v', angle: 'front' as const }],
  replied,
})

describe('nextStatusAfter', () => {
  it('生徒が提出やチャットを送ったら、コーチの番', () => {
    const thread = { status: 'waiting_student' as const, submissions: [submission(true)] }
    expect(nextStatusAfter(thread, 'student_submitted')).toBe('waiting_coach')
    expect(nextStatusAfter(thread, 'student_chatted')).toBe('waiting_coach')
  })

  it('コーチが添削を返したら生徒の番。添削していない提出が残ればコーチの番のまま', () => {
    expect(
      nextStatusAfter(
        { status: 'waiting_coach', submissions: [submission(false)] },
        'coach_replied'
      )
    ).toBe('waiting_student')
    expect(
      nextStatusAfter(
        { status: 'waiting_coach', submissions: [submission(false), submission(false)] },
        'coach_replied'
      )
    ).toBe('waiting_coach')
  })

  it('コーチのチャットは、添削していない提出があればコーチの番のまま', () => {
    expect(
      nextStatusAfter(
        { status: 'waiting_coach', submissions: [submission(false)] },
        'coach_chatted'
      )
    ).toBe('waiting_coach')
    expect(
      nextStatusAfter({ status: 'waiting_coach', submissions: [submission(true)] }, 'coach_chatted')
    ).toBe('waiting_student')
  })

  it('終了したスレッドは変わらない', () => {
    expect(nextStatusAfter({ status: 'closed', submissions: [] }, 'student_submitted')).toBe(
      'closed'
    )
  })
})
