import { describe, expect, it } from 'vitest'
import { coachLicensesSchema, knownLicenses, licenseOtherSchema } from './CoachLicense'

describe('coachLicensesSchema', () => {
  it('選択肢から複数選べる。選ばなくてもよい', () => {
    expect(
      coachLicensesSchema.safeParse(['pga_tournament', 'pga_teaching_a', 'usgtf_teaching']).success
    ).toBe(true)
    expect(coachLicensesSchema.safeParse([]).success).toBe(true)
  })

  it('選択肢にないものや、同じものの重複は受け付けない', () => {
    expect(coachLicensesSchema.safeParse(['usga']).success).toBe(false)
    expect(coachLicensesSchema.safeParse(['jipga', 'jipga']).success).toBe(false)
  })
})

describe('licenseOtherSchema', () => {
  it('前後の空白を取り、50文字まで', () => {
    expect(licenseOtherSchema.parse('  USGTF 認定 ')).toBe('USGTF 認定')
    expect(licenseOtherSchema.safeParse('あ'.repeat(51)).success).toBe(false)
  })
})

describe('knownLicenses', () => {
  it('いまの選択肢にないもの（以前の選択肢など）は外す', () => {
    expect(knownLicenses(['jlpga_teaching', 'pga_member'])).toEqual(['jlpga_teaching'])
  })
})
