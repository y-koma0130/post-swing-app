import { describe, expect, it } from 'vitest'
import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'
import { localDateSchema } from '@/server/utils/localDate'
import { decideSendGuard } from './decideSendGuard.service'

const absent: CoachAvailability = {
  kind: 'absent',
  absence: {
    id: 'a1',
    coachUserId: 'c1',
    startDate: localDateSchema.parse('2026-11-20'),
    endDate: localDateSchema.parse('2026-11-23'),
    note: '',
    pauseNewSignups: false,
  },
  resumeDate: localDateSchema.parse('2026-11-24'),
}
const delayed: CoachAvailability = { kind: 'delayed' }
const available: CoachAvailability = { kind: 'available', replyTargetHours: 48 }

describe('decideSendGuard（状態 × 送るもの × 了承済み）', () => {
  const cases: Array<[CoachAvailability, 'video' | 'chat', boolean, string]> = [
    [absent, 'video', false, 'confirm'],
    [absent, 'video', true, 'confirm'],
    [absent, 'chat', false, 'confirm_with_skip'],
    [absent, 'chat', true, 'none'],
    [delayed, 'video', false, 'confirm'],
    [delayed, 'video', true, 'confirm'],
    [delayed, 'chat', false, 'none'],
    [delayed, 'chat', true, 'none'],
    [available, 'video', false, 'none'],
    [available, 'video', true, 'none'],
    [available, 'chat', false, 'none'],
    [available, 'chat', true, 'none'],
  ]
  it.each(cases)(
    '%o に %s を送る（了承済み %s）→ %s',
    (availability, target, acknowledged, expected) => {
      expect(decideSendGuard({ availability, target, acknowledged })).toBe(expected)
    }
  )
})
