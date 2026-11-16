import { describe, expect, it } from 'vitest'
import { localDateSchema } from '@/server/utils/localDate'
import { calcEffectiveExpiry } from './calcEffectiveExpiry.service'

const range = (start: string, end: string) => ({
  startDate: localDateSchema.parse(start),
  endDate: localDateSchema.parse(end),
})
// 日本時間 11/1 10:00 に始まり、12/1 10:00 に終わる30日のスレッド
const thread = {
  startedAt: new Date('2026-11-01T10:00:00+09:00'),
  expiresAt: new Date('2026-12-01T10:00:00+09:00'),
}

describe('calcEffectiveExpiry', () => {
  it('不在がなければ、保存した期限のまま', () => {
    expect(calcEffectiveExpiry(thread, [])).toEqual({
      expiresAt: thread.expiresAt,
      extendedDays: 0,
    })
  })

  it('期間中の不在日数（両端を含む）だけ延ばす', () => {
    expect(calcEffectiveExpiry(thread, [range('2026-11-20', '2026-11-23')])).toEqual({
      expiresAt: new Date('2026-12-05T10:00:00+09:00'),
      extendedDays: 4,
    })
  })

  it('期間の外の不在は数えない。始まる前に終わった不在も数えない', () => {
    expect(
      calcEffectiveExpiry(thread, [
        range('2026-10-20', '2026-10-31'),
        range('2026-12-10', '2026-12-12'),
      ]).extendedDays
    ).toBe(0)
  })

  it('延ばした先で新しい不在に重なれば、その分も延ばす（月をまたいで）', () => {
    // 11/20〜11/23 で4日延びて 12/5 → 12/3〜12/6 と重なる（12/3〜12/5 の3日）→ 12/8 → さらに 12/6 も重なり 12/9
    const result = calcEffectiveExpiry(thread, [
      range('2026-11-20', '2026-11-23'),
      range('2026-12-03', '2026-12-06'),
    ])
    expect(result.extendedDays).toBe(8)
    expect(result.expiresAt).toEqual(new Date('2026-12-09T10:00:00+09:00'))
  })

  it('日本時間で数える（UTC では前日でも、日本時間で期間に入っていれば数える）', () => {
    const lateNight = {
      startedAt: new Date('2026-11-01T00:30:00+09:00'), // UTC では 10/31
      expiresAt: new Date('2026-12-01T00:30:00+09:00'),
    }
    expect(calcEffectiveExpiry(lateNight, [range('2026-11-01', '2026-11-01')]).extendedDays).toBe(1)
  })
})
