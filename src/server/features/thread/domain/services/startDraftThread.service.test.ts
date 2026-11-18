import { describe, expect, it } from 'vitest'
import { startDraftThread } from './startDraftThread.service'

describe('startDraftThread', () => {
  it('下書きとして作る（期間は仮の値、請求のひも付けなし）', () => {
    const now = new Date('2026-11-20T00:00:00Z')
    expect(
      startDraftThread({
        id: 't1',
        purchaseId: 'p1',
        coachUserId: 'c1',
        studentUserId: 's1',
        planKind: 'trial',
        now,
      })
    ).toEqual({
      id: 't1',
      purchaseId: 'p1',
      coachUserId: 'c1',
      studentUserId: 's1',
      planKind: 'trial',
      status: 'draft',
      startedAt: now,
      expiresAt: new Date('2026-12-20T00:00:00Z'),
      stripeInvoiceId: null,
    })
  })
})
