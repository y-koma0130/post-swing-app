import { describe, expect, it } from 'vitest'
import { approveThread } from './approveThread.service'

const submission = (replied: boolean) => ({
  id: crypto.randomUUID(),
  submittedAt: new Date('2026-11-19T00:00:00Z'),
  note: '',
  videos: [{ id: 'v', angle: 'front' as const }],
  replied,
})

describe('approveThread', () => {
  it('承認した時点から30日。申し込みの動画を添削するところ（コーチの番）から始まる', () => {
    const approvedAt = new Date('2026-11-20T00:00:00Z')
    expect(approveThread({ submissions: [submission(false)] }, approvedAt)).toEqual({
      status: 'waiting_coach',
      startedAt: approvedAt,
      expiresAt: new Date('2026-12-20T00:00:00Z'),
    })
  })
})
