import { describe, expect, it } from 'vitest'
import type { Submission } from '../values/Submission'
import { shouldCloseThread } from './shouldCloseThread.service'

const submission = (replied: boolean): Submission => ({
  id: `s-${replied}`,
  submittedAt: new Date('2026-11-01T10:00:00+09:00'),
  note: '',
  videos: [{ id: 'v1', angle: 'front' }],
  replied,
})

const expiresAt = new Date('2026-11-30T10:00:00+09:00')
const afterExpiry = new Date('2026-11-30T10:00:01+09:00')

describe('shouldCloseThread', () => {
  it('期限を過ぎ、すべての提出に添削を返していたら終了する', () => {
    expect(
      shouldCloseThread(
        { status: 'waiting_student', expiresAt, submissions: [submission(true)] },
        afterExpiry
      )
    ).toBe(true)
  })

  it('ちょうど期限の時刻でも終了する', () => {
    expect(
      shouldCloseThread({ status: 'waiting_student', expiresAt, submissions: [] }, expiresAt)
    ).toBe(true)
  })

  it('期限の前は終了しない', () => {
    expect(
      shouldCloseThread(
        { status: 'waiting_student', expiresAt, submissions: [] },
        new Date('2026-11-30T09:59:59+09:00')
      )
    ).toBe(false)
  })

  it('添削を返していない提出があれば、期限を過ぎても終了しない', () => {
    expect(
      shouldCloseThread(
        { status: 'waiting_coach', expiresAt, submissions: [submission(true), submission(false)] },
        afterExpiry
      )
    ).toBe(false)
  })

  it('レッスン中でなければ（下書き・承認待ち・終了・お断り）扱わない', () => {
    for (const status of ['draft', 'requested', 'closed', 'declined'] as const) {
      expect(shouldCloseThread({ status, expiresAt, submissions: [] }, afterExpiry)).toBe(false)
    }
  })
})
