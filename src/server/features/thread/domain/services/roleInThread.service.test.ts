import { describe, expect, it } from 'vitest'
import { roleInThread } from './roleInThread.service'

const thread = { coachUserId: 'coach-1', studentUserId: 'student-1' }

describe('roleInThread', () => {
  it('担当のコーチと本人の生徒を見分ける', () => {
    expect(roleInThread(thread, 'coach-1')).toBe('coach')
    expect(roleInThread(thread, 'student-1')).toBe('student')
  })

  it('ほかの人は null', () => {
    expect(roleInThread(thread, 'someone')).toBeNull()
  })
})
