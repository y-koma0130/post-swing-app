import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { calcReplyDueAt, isReplyDuePassedToday } from './calcReplyDueAt.service'

const absences = [
  { startDate: localDateSchema.parse('2026-11-20'), endDate: localDateSchema.parse('2026-11-23') },
]

describe('calcReplyDueAt', () => {
  it('通常は届いてから48時間', () => {
    expect(calcReplyDueAt(new Date('2026-11-16T10:00:00+09:00'), absences)).toEqual(
      new Date('2026-11-18T10:00:00+09:00')
    )
  })

  it('不在中（終了日の夜も含む）に届いたものは、再開日の0時から48時間', () => {
    expect(calcReplyDueAt(new Date('2026-11-23T23:30:00+09:00'), absences)).toEqual(
      new Date('2026-11-26T00:00:00+09:00')
    )
  })
})

describe('isReplyDuePassedToday', () => {
  const now = new Date('2026-11-20T04:00:00+09:00')
  it('直近1日のあいだに期限を過ぎたものだけ', () => {
    expect(isReplyDuePassedToday(new Date('2026-11-19T10:00:00+09:00'), now)).toBe(true)
    expect(isReplyDuePassedToday(new Date('2026-11-18T10:00:00+09:00'), now)).toBe(false)
    expect(isReplyDuePassedToday(new Date('2026-11-20T10:00:00+09:00'), now)).toBe(false)
  })
})
