import { describe, expect, it } from 'vitest'
import { isAdultAgeRange, parseGolfProfile } from './GolfProfile'

const form = (
  input: Partial<{ ageRange: string; roundFrequency: string; averageScore: string }>
) => ({
  ageRange: '',
  roundFrequency: '',
  averageScore: '',
  ...input,
})

describe('parseGolfProfile', () => {
  it('書かなかった項目は null になる（年代が必須かは提出の確認で決める）', () => {
    expect(parseGolfProfile(form({}))).toEqual({
      ageRange: null,
      roundFrequency: null,
      averageScore: null,
    })
  })

  it('年代・ラウンドの回数・平均スコアを読む', () => {
    expect(
      parseGolfProfile(form({ ageRange: '40s', roundFrequency: 'monthly', averageScore: ' 98 ' }))
    ).toEqual({ ageRange: '40s', roundFrequency: 'monthly', averageScore: 98 })
  })

  it('選択肢にない年代・回数や、範囲外・小数のスコアは読めない', () => {
    expect(parseGolfProfile(form({ ageRange: '20s' }))).toBeNull()
    expect(parseGolfProfile(form({ roundFrequency: 'daily' }))).toBeNull()
    expect(parseGolfProfile(form({ averageScore: '30' }))).toBeNull()
    expect(parseGolfProfile(form({ averageScore: '201' }))).toBeNull()
    expect(parseGolfProfile(form({ averageScore: '95.5' }))).toBeNull()
    expect(parseGolfProfile(form({ averageScore: 'abc' }))).toBeNull()
  })
})

describe('isAdultAgeRange', () => {
  it('18歳以上の年代だけ', () => {
    expect(isAdultAgeRange('18_29')).toBe(true)
    expect(isAdultAgeRange('70_plus')).toBe(true)
    expect(isAdultAgeRange('under_18')).toBe(false)
    expect(isAdultAgeRange(null)).toBe(false)
  })
})
