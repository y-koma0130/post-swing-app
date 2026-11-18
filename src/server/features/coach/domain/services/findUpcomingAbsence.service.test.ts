import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { CoachAbsence } from '../values/CoachAbsence'
import { decideSignupGuard } from './decideSignupGuard.service'
import { findUpcomingAbsence } from './findUpcomingAbsence.service'

const absence = (start: string, end: string, pauseNewSignups = false): CoachAbsence => ({
  id: start,
  coachUserId: 'c1',
  startDate: localDateSchema.parse(start),
  endDate: localDateSchema.parse(end),
  note: '',
  pauseNewSignups,
})
const now = new Date('2026-11-16T12:00:00+09:00')

describe('findUpcomingAbsence', () => {
  it('明日から7日以内に始まる、いちばん近い不在', () => {
    const absences = [
      absence('2026-11-30', '2026-12-01'),
      absence('2026-11-23', '2026-11-24'),
      absence('2026-11-20', '2026-11-21'),
    ]
    expect(findUpcomingAbsence({ absences, now })?.id).toBe('2026-11-20')
  })

  it('8日以上先や、今日始まっている不在は出さない', () => {
    expect(findUpcomingAbsence({ absences: [absence('2026-11-24', '2026-11-25')], now })).toBeNull()
    expect(findUpcomingAbsence({ absences: [absence('2026-11-16', '2026-11-18')], now })).toBeNull()
  })
})

describe('decideSignupGuard', () => {
  const resumeDate = localDateSchema.parse('2026-11-24')

  it('不在中は、新規を止める設定によらず申し込めない（48時間以内に受けるか決められないため）', () => {
    for (const pause of [true, false]) {
      expect(
        decideSignupGuard({
          kind: 'absent',
          absence: absence('2026-11-20', '2026-11-23', pause),
          resumeDate,
        })
      ).toBe('paused')
    }
  })

  it('返信遅れは了承が要り、通常はそのまま', () => {
    expect(decideSignupGuard({ kind: 'delayed' })).toBe('ack_required')
    expect(decideSignupGuard({ kind: 'available', replyTargetHours: 48 })).toBe('open')
  })
})
