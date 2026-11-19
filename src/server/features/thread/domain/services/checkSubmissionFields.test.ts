import { describe, expect, it } from 'vitest'
import { checkSubmissionFields } from './checkSubmissionContents.service'

const golfProfile = { ageRange: '40s', roundFrequency: '', averageScore: '' }
const input = { isFirst: true, theme: 'トップで右ひざが流れる', note: '', golfProfile }

describe('checkSubmissionFields', () => {
  it('最初の提出は、テーマと年代が要る', () => {
    expect(checkSubmissionFields(input).ok).toBe(true)
    expect(checkSubmissionFields({ ...input, theme: ' ' })).toEqual({
      ok: false,
      error: 'theme_required',
    })
    expect(
      checkSubmissionFields({ ...input, golfProfile: { ...golfProfile, ageRange: '' } })
    ).toEqual({ ok: false, error: 'age_required' })
  })

  it('平均スコアは50〜200', () => {
    expect(
      checkSubmissionFields({ ...input, golfProfile: { ...golfProfile, averageScore: '300' } })
    ).toEqual({ ok: false, error: 'invalid_golf_profile' })
  })

  it('2回目からは、テーマや年代を見ない', () => {
    expect(
      checkSubmissionFields({
        ...input,
        isFirst: false,
        theme: '',
        golfProfile: { ...golfProfile, ageRange: '' },
      })
    ).toEqual({ ok: true, value: { note: '', theme: null, golfProfile: null } })
  })
})
