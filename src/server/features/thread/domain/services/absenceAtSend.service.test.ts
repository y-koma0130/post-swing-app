import { describe, expect, it } from 'vitest'
import { coachAbsenceSchema } from '@/server/features/coach/domain/values/CoachAbsence'
import { localDateSchema } from '@/server/utils/localDate'
import { absenceAtSend } from './absenceAtSend.service'

const absence = coachAbsenceSchema.parse({
  id: 'ab-1',
  coachUserId: 'coach-1',
  startDate: '2026-11-20',
  endDate: '2026-11-23',
  note: '',
  pauseNewSignups: true,
})

describe('absenceAtSend', () => {
  it('不在中に送られたら、どの不在かと終わる日を残す', () => {
    expect(
      absenceAtSend({ kind: 'absent', absence, resumeDate: localDateSchema.parse('2026-11-24') })
    ).toEqual({ absenceId: 'ab-1', absenceEndDate: '2026-11-23' })
  })

  it('不在でなければ何も残さない（返信が遅れがちのときも）', () => {
    expect(absenceAtSend({ kind: 'available', replyTargetHours: 48 })).toBeNull()
    expect(absenceAtSend({ kind: 'delayed' })).toBeNull()
  })
})
