import { describe, expect, it } from 'vitest'
import { retakeMessageSchema, retakeReasonSchema } from './RetakeRequest'

describe('retakeMessageSchema', () => {
  it('200文字までなら受け付ける。空でもよい', () => {
    expect(retakeMessageSchema.safeParse('あ'.repeat(200)).success).toBe(true)
    expect(retakeMessageSchema.parse('')).toBe('')
  })

  it('201文字は受け付けない', () => {
    expect(retakeMessageSchema.safeParse('あ'.repeat(201)).success).toBe(false)
  })

  it('前後の空白を取ってから長さを数える', () => {
    expect(retakeMessageSchema.parse('  全身が入るように  ')).toBe('全身が入るように')
    expect(retakeMessageSchema.safeParse(` ${'あ'.repeat(200)} `).success).toBe(true)
  })
})

describe('retakeReasonSchema', () => {
  it('選択肢にない理由は受け付けない', () => {
    expect(retakeReasonSchema.safeParse('framing').success).toBe(true)
    expect(retakeReasonSchema.safeParse('unknown').success).toBe(false)
  })
})
