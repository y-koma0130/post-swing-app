import { describe, expect, it } from 'vitest'
import { countRemainingStudentMessages } from './countRemainingStudentMessages.service'

const message = (from: 'coach' | 'student') => ({
  id: 'm',
  from,
  body: 'はい',
  sentAt: new Date(),
  attachment: { kind: 'none' as const },
  quote: null,
})

describe('countRemainingStudentMessages', () => {
  it('生徒はレッスン全体で30通。コーチの分は数えない', () => {
    expect(countRemainingStudentMessages({ planKind: 'single', messages: [] })).toBe(30)
    const messages = [message('student'), message('coach'), message('student')]
    expect(countRemainingStudentMessages({ planKind: 'monthly', messages })).toBe(28)
  })

  it('お試しは10通', () => {
    expect(countRemainingStudentMessages({ planKind: 'trial', messages: [] })).toBe(10)
  })

  it('使い切ったら0（マイナスにしない）', () => {
    const messages = Array.from({ length: 12 }, () => message('student'))
    expect(countRemainingStudentMessages({ planKind: 'trial', messages })).toBe(0)
  })
})
