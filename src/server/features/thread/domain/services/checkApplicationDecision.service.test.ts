import { describe, expect, it } from 'vitest'
import { calcApprovalDeadline } from './calcApprovalDeadline.service'
import { checkApplicationDecision } from './checkApplicationDecision.service'

const requestedAt = new Date('2026-11-20T00:00:00Z')
const requested = { status: 'requested' as const, requestedAt }

describe('checkApplicationDecision', () => {
  it('返事の期限は、承認を待ち始めてから48時間', () => {
    expect(calcApprovalDeadline(requestedAt)).toEqual(new Date('2026-11-22T00:00:00Z'))
  })

  it('承認待ちなら、期限までは受けられる・断れる', () => {
    const now = new Date('2026-11-21T23:59:00Z')
    expect(checkApplicationDecision(requested, 'approve', now)).toBeNull()
    expect(checkApplicationDecision(requested, 'decline', now)).toBeNull()
  })

  it('期限を過ぎたら受けられない（断るのはできる）', () => {
    const now = new Date('2026-11-22T00:00:00Z')
    expect(checkApplicationDecision(requested, 'approve', now)).toBe('approval_expired')
    expect(checkApplicationDecision(requested, 'decline', now)).toBeNull()
  })

  it('承認待ちでない申し込み（下書き・決まったもの・レッスン中）には返事できない', () => {
    const now = new Date('2026-11-20T01:00:00Z')
    for (const status of ['draft', 'declined', 'waiting_coach', 'closed'] as const) {
      expect(checkApplicationDecision({ status, requestedAt }, 'approve', now)).toBe(
        'not_requested'
      )
    }
    expect(
      checkApplicationDecision({ status: 'requested', requestedAt: null }, 'decline', now)
    ).toBe('not_requested')
  })
})
