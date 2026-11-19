import { describe, expect, it } from 'vitest'
import { openRetake } from '../../application/usecases/retakeTestFixtures'
import { findRespondableRetake } from './findRespondableRetake.service'

const closed = openRetake({
  id: 'req-0',
  closedAt: new Date('2026-11-11T12:00:00Z'),
  closeReason: 'resent',
})
const open = openRetake({ id: 'req-1' })

describe('findRespondableRetake', () => {
  it('添削待ちのレッスンで開いているお願いなら答えられる', () => {
    expect(
      findRespondableRetake({
        threadStatus: 'waiting_coach',
        requests: [closed, open],
        requestId: 'req-1',
      })
    ).toEqual(open)
  })

  it('お願いを決めずに探すときは、開いているものを返す', () => {
    expect(
      findRespondableRetake({
        threadStatus: 'waiting_coach',
        requests: [closed, open],
        requestId: null,
      })
    ).toEqual(open)
  })

  it('終わったお願い・知らないお願いには答えられない', () => {
    for (const requestId of ['req-0', 'req-9']) {
      expect(
        findRespondableRetake({
          threadStatus: 'waiting_coach',
          requests: [closed, open],
          requestId,
        })
      ).toBeNull()
    }
  })

  it('添削待ちでないレッスン（終わった・返金した・生徒の番）のお願いには答えられない', () => {
    for (const threadStatus of ['closed', 'waiting_student', 'declined'] as const) {
      expect(
        findRespondableRetake({ threadStatus, requests: [open], requestId: 'req-1' })
      ).toBeNull()
    }
  })
})
