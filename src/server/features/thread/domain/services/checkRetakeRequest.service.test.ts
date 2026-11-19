import { describe, expect, it } from 'vitest'
import { checkRetakeRequest, remainingRetakes } from './checkRetakeRequest.service'

const submission = (id: string, replied: boolean) => ({
  id,
  submittedAt: new Date(),
  note: '',
  videos: [{ id: `v-${id}`, angle: 'front' as const }],
  replied,
})
const thread = {
  status: 'waiting_coach' as const,
  submissions: [submission('s1', true), submission('s2', false)],
}
const closed = { closedAt: new Date() }
const open = { closedAt: null }

describe('checkRetakeRequest', () => {
  it('添削を待っている、いちばん新しい提出にお願いできる', () => {
    expect(checkRetakeRequest({ thread, requests: [], submissionId: 's2' })).toBeNull()
  })

  it('添削済みの提出や古い提出にはお願いできない', () => {
    expect(checkRetakeRequest({ thread, requests: [], submissionId: 's1' })).toBe('not_waiting')
  })

  it('コーチの番でなければお願いできない（承認待ち・生徒の番・終了）', () => {
    for (const status of ['requested', 'waiting_student', 'closed'] as const) {
      expect(
        checkRetakeRequest({ thread: { ...thread, status }, requests: [], submissionId: 's2' })
      ).toBe('not_in_lesson')
    }
  })

  it('開いているお願いがあれば、次はお願いできない', () => {
    expect(checkRetakeRequest({ thread, requests: [open], submissionId: 's2' })).toBe(
      'already_open'
    )
  })

  it('1つのスレッドで2回まで', () => {
    expect(checkRetakeRequest({ thread, requests: [closed], submissionId: 's2' })).toBeNull()
    expect(checkRetakeRequest({ thread, requests: [closed, closed], submissionId: 's2' })).toBe(
      'retake_limit'
    )
    expect(remainingRetakes([closed])).toBe(1)
    expect(remainingRetakes([closed, closed, closed])).toBe(0)
  })
})
