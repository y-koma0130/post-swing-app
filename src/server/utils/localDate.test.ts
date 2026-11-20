import { describe, expect, it } from 'vitest'
import {
  addDays,
  diffDays,
  localDateSchema,
  overlapDays,
  startOfLocalDate,
  startOfLocalMonth,
  toLocalDate,
} from './localDate'

const d = (value: string) => localDateSchema.parse(value)

describe('localDate', () => {
  it('日本時間の0時をまたぐと、日付が変わる', () => {
    expect(toLocalDate(new Date('2026-11-22T14:59:59Z'))).toBe('2026-11-22')
    expect(toLocalDate(new Date('2026-11-22T15:00:00Z'))).toBe('2026-11-23')
  })

  it('月末・年末をまたいで足し引きできる', () => {
    expect(addDays(d('2026-11-30'), 1)).toBe('2026-12-01')
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01')
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28')
  })

  it('その日の日本時間0時は、前日の UTC 15時', () => {
    expect(startOfLocalDate(d('2026-11-24')).toISOString()).toBe('2026-11-23T15:00:00.000Z')
  })

  it('ない日付は受け付けない', () => {
    expect(localDateSchema.safeParse('2026-02-30').success).toBe(false)
    expect(localDateSchema.safeParse('2026/11/24').success).toBe(false)
  })

  it('日数の差と、期間が重なる日数（両端を含む）', () => {
    expect(diffDays(d('2026-11-20'), d('2026-11-23'))).toBe(3)
    expect(
      overlapDays(
        { start: d('2026-11-20'), end: d('2026-11-23') },
        { start: d('2026-11-22'), end: d('2026-11-30') }
      )
    ).toBe(2)
    expect(
      overlapDays(
        { start: d('2026-11-20'), end: d('2026-11-21') },
        { start: d('2026-11-22'), end: d('2026-11-30') }
      )
    ).toBe(0)
  })
})

describe('startOfLocalMonth', () => {
  it('日本時間の月の1日0時にする（UTC では前日の15時）', () => {
    expect(startOfLocalMonth(new Date('2026-11-20T03:00:00Z')).toISOString()).toBe(
      '2026-10-31T15:00:00.000Z'
    )
  })

  it('月末の夜（日本時間ではもう翌月）は、翌月の1日', () => {
    expect(startOfLocalMonth(new Date('2026-11-30T16:00:00Z')).toISOString()).toBe(
      '2026-11-30T15:00:00.000Z'
    )
  })
})
