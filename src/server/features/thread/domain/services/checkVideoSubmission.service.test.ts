import { describe, expect, it } from 'vitest'
import { checkVideoSubmission } from './checkVideoSubmission.service'

const now = new Date('2026-11-14T00:00:00Z')
const base = {
  status: 'waiting_student' as const,
  expiresAt: new Date('2026-12-01T00:00:00Z'),
  planKind: 'single' as const,
  videos: [],
}
const video = (replied: boolean) => ({ id: 'v', uploadedAt: now, note: '', replied })

describe('checkVideoSubmission', () => {
  it('最初の動画は送れる', () => {
    expect(checkVideoSubmission(base, now)).toBeNull()
  })

  it('前の動画に返信がないと送れない', () => {
    expect(checkVideoSubmission({ ...base, videos: [video(false)] }, now)).toBe('awaiting_reply')
  })

  it('返信があれば次を送れる', () => {
    expect(checkVideoSubmission({ ...base, videos: [video(true)] }, now)).toBeNull()
  })

  it('1スレッドは3本まで', () => {
    const videos = [video(true), video(true), video(true)]
    expect(checkVideoSubmission({ ...base, videos }, now)).toBe('video_limit')
  })

  it('お試しは1本まで', () => {
    expect(checkVideoSubmission({ ...base, planKind: 'trial', videos: [video(true)] }, now)).toBe(
      'video_limit'
    )
  })

  it('期限を過ぎたら送れない', () => {
    expect(checkVideoSubmission({ ...base, expiresAt: now }, now)).toBe('expired')
  })

  it('終了したスレッドには送れない', () => {
    expect(checkVideoSubmission({ ...base, status: 'closed' }, now)).toBe('closed')
  })
})
