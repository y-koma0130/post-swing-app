import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { checkAbsence } from './checkAbsence.service'

const d = (value: string) => localDateSchema.parse(value)
const today = d('2026-11-16')
const range = (start: string, end: string) => ({ startDate: d(start), endDate: d(end) })

describe('checkAbsence', () => {
  it('今日を含む・これからの期間は登録できる。1日だけの不在もよい', () => {
    expect(
      checkAbsence({ absence: range('2026-11-16', '2026-11-16'), others: [], today })
    ).toBeNull()
    expect(
      checkAbsence({ absence: range('2026-11-10', '2026-11-20'), others: [], today })
    ).toBeNull()
  })

  it('開始日が終了日より後ならエラー', () => {
    expect(checkAbsence({ absence: range('2026-11-21', '2026-11-20'), others: [], today })).toBe(
      'invalid_range'
    )
  })

  it('終わった期間（終了日が今日より前）はエラー', () => {
    expect(checkAbsence({ absence: range('2026-11-01', '2026-11-15'), others: [], today })).toBe(
      'past'
    )
  })

  it('ほかの不在と1日でも重なればエラー。隣り合うのはよい', () => {
    const others = [range('2026-11-20', '2026-11-23')]
    expect(checkAbsence({ absence: range('2026-11-23', '2026-11-25'), others, today })).toBe(
      'overlap'
    )
    expect(checkAbsence({ absence: range('2026-11-24', '2026-11-25'), others, today })).toBeNull()
  })
})
