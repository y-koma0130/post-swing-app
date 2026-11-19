import { describe, expect, it } from 'vitest'
import { chartEntryBodySchema, chartMemoSchema, chartTagsSchema } from './StudentChart'

describe('chartTagsSchema', () => {
  it('前後の空白を取り、同じタグは1つにまとめる', () => {
    expect(chartTagsSchema.parse([' スライス', 'スライス ', '初心者'])).toEqual([
      'スライス',
      '初心者',
    ])
  })

  it('20文字を超えるタグ、11個以上、空のタグは受け付けない', () => {
    expect(chartTagsSchema.safeParse(['あ'.repeat(21)]).success).toBe(false)
    expect(chartTagsSchema.safeParse(Array.from({ length: 11 }, (_, i) => `t${i}`)).success).toBe(
      false
    )
    expect(chartTagsSchema.safeParse(['  ']).success).toBe(false)
  })
})

describe('chartMemoSchema・chartEntryBodySchema', () => {
  it('メモは空でもよく、5000文字まで', () => {
    expect(chartMemoSchema.safeParse('').success).toBe(true)
    expect(chartMemoSchema.safeParse('あ'.repeat(5001)).success).toBe(false)
  })

  it('記録は空にできず、1000文字まで', () => {
    expect(chartEntryBodySchema.safeParse('  ').success).toBe(false)
    expect(chartEntryBodySchema.safeParse('あ'.repeat(1001)).success).toBe(false)
    expect(chartEntryBodySchema.parse(' トップの右ひざ ')).toBe('トップの右ひざ')
  })
})
