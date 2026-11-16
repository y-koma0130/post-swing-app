import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import type { CoachAbsence } from '../values/CoachAbsence'
import {
  calcCoachAvailability,
  delayFlagExpiresAt,
  isDelayFlagActive,
} from './calcCoachAvailability.service'

const absence = (
  start: string,
  end: string,
  overrides: Partial<CoachAbsence> = {}
): CoachAbsence => ({
  id: `${start}-${end}`,
  coachUserId: 'c1',
  startDate: localDateSchema.parse(start),
  endDate: localDateSchema.parse(end),
  note: '',
  pauseNewSignups: false,
  ...overrides,
})

/** 日本時間の時刻 */
const jst = (value: string) => new Date(`${value}+09:00`)

describe('calcCoachAvailability', () => {
  const absences = [absence('2026-11-20', '2026-11-23')]

  it('終了日の当日（日本時間）は不在で、再開は翌日', () => {
    expect(
      calcCoachAvailability({ absences, delayFlagSetAt: null, now: jst('2026-11-23T23:59:00') })
    ).toMatchObject({ kind: 'absent', resumeDate: '2026-11-24' })
  })

  it('翌日の0時（日本時間）から通常に戻る', () => {
    expect(
      calcCoachAvailability({ absences, delayFlagSetAt: null, now: jst('2026-11-24T00:00:00') })
    ).toEqual({ kind: 'available', replyTargetHours: 48 })
  })

  it('開始日の0時（日本時間）から不在。UTC ではまだ前日でも', () => {
    // 2026-11-19T15:00Z = 日本時間 11/20 0:00
    expect(
      calcCoachAvailability({
        absences,
        delayFlagSetAt: null,
        now: new Date('2026-11-19T15:00:00Z'),
      }).kind
    ).toBe('absent')
  })

  it('不在が複数あっても、今日を含むものを使う', () => {
    const many = [
      absence('2026-11-01', '2026-11-03'),
      ...absences,
      absence('2026-12-01', '2026-12-02'),
    ]
    const result = calcCoachAvailability({
      absences: many,
      delayFlagSetAt: null,
      now: jst('2026-11-21T12:00:00'),
    })
    expect(result.kind === 'absent' && result.absence.id).toBe('2026-11-20-2026-11-23')
  })

  it('不在と返信遅れが重なれば、不在を優先する', () => {
    expect(
      calcCoachAvailability({
        absences,
        delayFlagSetAt: jst('2026-11-21T09:00:00'),
        now: jst('2026-11-21T12:00:00'),
      }).kind
    ).toBe('absent')
  })

  it('返信遅れフラグは7日で自動で外れる', () => {
    const setAt = jst('2026-11-01T10:00:00')
    expect(
      calcCoachAvailability({
        absences: [],
        delayFlagSetAt: setAt,
        now: jst('2026-11-08T09:59:00'),
      }).kind
    ).toBe('delayed')
    expect(
      calcCoachAvailability({
        absences: [],
        delayFlagSetAt: setAt,
        now: jst('2026-11-08T10:00:00'),
      }).kind
    ).toBe('available')
    expect(isDelayFlagActive(null, setAt)).toBe(false)
    expect(delayFlagExpiresAt(setAt)).toEqual(jst('2026-11-08T10:00:00'))
  })
})
