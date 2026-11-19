import { describe, expect, it } from 'vitest'
import { golfProfileText } from './threadText'

describe('golfProfileText', () => {
  it('書いたものだけを並べる', () => {
    expect(golfProfileText({ roundFrequency: 'monthly', averageScore: 98 })).toBe(
      'ラウンド 月1回くらい・平均スコア 98'
    )
    expect(golfProfileText({ roundFrequency: null, averageScore: 110 })).toBe('平均スコア 110')
  })

  it('どちらも書いていなければ null', () => {
    expect(golfProfileText({ roundFrequency: null, averageScore: null })).toBeNull()
  })
})
