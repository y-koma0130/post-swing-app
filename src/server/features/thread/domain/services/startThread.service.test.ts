import { describe, expect, it } from 'vitest'
import { startThread } from './startThread.service'

describe('startThread', () => {
  it('支払った時点から30日。最初は生徒の番', () => {
    const paidAt = new Date('2026-11-16T00:00:00Z')
    expect(
      startThread({
        id: 't1',
        purchaseId: 'p1',
        coachUserId: 'coach-1',
        studentUserId: 'student-1',
        planKind: 'single',
        paidAt,
        stripeInvoiceId: null,
      })
    ).toEqual({
      id: 't1',
      purchaseId: 'p1',
      coachUserId: 'coach-1',
      studentUserId: 'student-1',
      planKind: 'single',
      status: 'waiting_student',
      startedAt: paidAt,
      expiresAt: new Date('2026-12-16T00:00:00Z'),
      stripeInvoiceId: null,
    })
  })
})
