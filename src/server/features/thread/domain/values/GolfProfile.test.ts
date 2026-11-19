import { describe, expect, it } from 'vitest'
import { parseGolfProfile } from './GolfProfile'

describe('parseGolfProfile', () => {
  it('どちらも書かなければ null の組になる（任意）', () => {
    expect(parseGolfProfile({ roundFrequency: '', averageScore: '' })).toEqual({
      roundFrequency: null,
      averageScore: null,
    })
  })

  it('ラウンドの回数と平均スコアを読む', () => {
    expect(parseGolfProfile({ roundFrequency: 'monthly', averageScore: ' 98 ' })).toEqual({
      roundFrequency: 'monthly',
      averageScore: 98,
    })
  })

  it('選択肢にない回数や、範囲外・小数のスコアは読めない', () => {
    expect(parseGolfProfile({ roundFrequency: 'daily', averageScore: '' })).toBeNull()
    expect(parseGolfProfile({ roundFrequency: '', averageScore: '30' })).toBeNull()
    expect(parseGolfProfile({ roundFrequency: '', averageScore: '201' })).toBeNull()
    expect(parseGolfProfile({ roundFrequency: '', averageScore: '95.5' })).toBeNull()
    expect(parseGolfProfile({ roundFrequency: '', averageScore: 'abc' })).toBeNull()
  })
})
