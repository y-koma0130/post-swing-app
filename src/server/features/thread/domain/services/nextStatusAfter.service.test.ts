import { describe, expect, it } from 'vitest'
import { nextStatusAfter } from './nextStatusAfter.service'

const video = (replied: boolean) => ({
  id: crypto.randomUUID(),
  uploadedAt: new Date(),
  note: '',
  replied,
})

describe('nextStatusAfter', () => {
  it('生徒が動画やチャットを送ったら、コーチの番', () => {
    const thread = { status: 'waiting_student' as const, videos: [video(true)] }
    expect(nextStatusAfter(thread, 'student_sent_video')).toBe('waiting_coach')
    expect(nextStatusAfter(thread, 'student_chatted')).toBe('waiting_coach')
  })

  it('コーチが返信したら生徒の番。返信していない動画が残ればコーチの番のまま', () => {
    expect(
      nextStatusAfter({ status: 'waiting_coach', videos: [video(false)] }, 'coach_replied')
    ).toBe('waiting_student')
    expect(
      nextStatusAfter(
        { status: 'waiting_coach', videos: [video(false), video(false)] },
        'coach_replied'
      )
    ).toBe('waiting_coach')
  })

  it('終了したスレッドは変わらない', () => {
    expect(nextStatusAfter({ status: 'closed', videos: [] }, 'student_sent_video')).toBe('closed')
  })
})
