import { describe, expect, it } from 'vitest'
import { countRemainingStudentMessages } from './countRemainingStudentMessages.service'

const message = (videoId: string, from: 'student' | 'coach') => ({
  id: crypto.randomUUID(),
  videoId,
  from,
  body: 'テスト',
  sentAt: new Date(),
})

describe('countRemainingStudentMessages', () => {
  it('生徒の送信だけを数え、動画ごとに3通から引く', () => {
    const thread = {
      messages: [message('v1', 'student'), message('v1', 'coach'), message('v2', 'student')],
    }
    expect(countRemainingStudentMessages(thread, 'v1')).toBe(2)
  })

  it('3通を超えても0未満にならない', () => {
    const thread = { messages: Array.from({ length: 5 }, () => message('v1', 'student')) }
    expect(countRemainingStudentMessages(thread, 'v1')).toBe(0)
  })
})
