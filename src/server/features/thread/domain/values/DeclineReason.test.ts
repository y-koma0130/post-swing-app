import { describe, expect, it } from 'vitest'
import { coachDeclineReasonSchema, declineMessageSchema } from './DeclineReason'

describe('declineMessageSchema', () => {
  it('200文字までなら受け付ける。空でもよい', () => {
    expect(declineMessageSchema.safeParse('あ'.repeat(200)).success).toBe(true)
    expect(declineMessageSchema.parse('')).toBe('')
  })

  it('201文字は受け付けない', () => {
    expect(declineMessageSchema.safeParse('あ'.repeat(201)).success).toBe(false)
  })

  it('前後の空白を取ってから長さを数える', () => {
    expect(declineMessageSchema.parse('  ごめんなさい  ')).toBe('ごめんなさい')
    expect(declineMessageSchema.safeParse(` ${'あ'.repeat(200)} `).success).toBe(true)
  })
})

describe('coachDeclineReasonSchema', () => {
  it('コーチは期限切れ（システムが付ける理由）を選べない', () => {
    expect(coachDeclineReasonSchema.safeParse('out_of_scope').success).toBe(true)
    expect(coachDeclineReasonSchema.safeParse('expired').success).toBe(false)
  })
})
