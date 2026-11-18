import { describe, expect, it } from 'vitest'
import { coachFeeText, formatFeeRate, formatLongDate, grantStateText } from './feeText'

describe('feeText', () => {
  it('日付と率', () => {
    expect(formatLongDate('2027-02-18')).toBe('2027年2月18日')
    expect(formatFeeRate(0.1)).toBe('10%')
    expect(formatFeeRate(0)).toBe('0%')
    expect(formatFeeRate(0.05)).toBe('5%')
  })

  it('特典の状態', () => {
    expect(grantStateText({ kind: 'pending' }, 90)).toBe('未開始（初めての承認から90日間）')
    expect(grantStateText({ kind: 'active', endDate: '2027-02-18' }, 90)).toBe('2027年2月18日まで')
    expect(grantStateText({ kind: 'revoked' }, 90)).toBe('取り消し済み')
  })

  it('コーチの設定画面の説明', () => {
    expect(coachFeeText({ rate: 0.1, grant: null })).toBe('手数料は売上の10%です。')
    expect(
      coachFeeText({
        rate: 0.1,
        grant: {
          campaignName: '先行募集',
          feeRate: 0,
          durationDays: 90,
          state: { kind: 'pending' },
        },
      })
    ).toBe(
      '手数料は売上の10%です。最初の生徒の申し込みを承認した日から90日間、手数料0%になります（先行募集の特典）。'
    )
    expect(
      coachFeeText({
        rate: 0,
        grant: {
          campaignName: '先行募集',
          feeRate: 0,
          durationDays: 90,
          state: { kind: 'active', endDate: '2027-02-18' },
        },
      })
    ).toBe('いまは手数料0%です（2027年2月18日まで）。そのあとは売上の10%です。')
  })
})
