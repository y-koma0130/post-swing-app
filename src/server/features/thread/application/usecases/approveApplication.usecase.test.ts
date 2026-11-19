import { describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/server/utils/result'
import type { Thread } from '../../domain/values/Thread'
import { threadIdSchema } from '../../domain/values/ThreadId'
import { approveApplication } from './approveApplication.usecase'
import { declineApplication } from './declineApplication.usecase'

type ApproveDeps = Parameters<typeof approveApplication>[1]
type DeclineDeps = Parameters<typeof declineApplication>[1]

const requestedAt = new Date('2026-11-20T00:00:00Z')
const now = new Date('2026-11-21T00:00:00Z')
const thread: Thread = {
  id: threadIdSchema.parse('thread-1'),
  coachUserId: 'coach-1',
  studentUserId: 'student-1',
  planKind: 'single',
  theme: 'トップで右ひざが流れる',
  status: 'requested',
  startedAt: requestedAt,
  expiresAt: new Date('2026-12-20T00:00:00Z'),
  closedAt: null,
  requestedAt,
  submissions: [
    {
      id: 's1',
      submittedAt: requestedAt,
      note: '',
      videos: [{ id: 'v1', angle: 'front' }],
      replied: false,
    },
  ],
  messages: [],
}
const coach = { userId: 'coach-1', name: '山田' }

const setupApprove = (t: Thread = thread, captured = true, hasPayment = true) => {
  const capturePayment = vi.fn<ApproveDeps['capturePayment']>(async () =>
    captured ? ok(null) : err('capture_failed')
  )
  const saveApproval = vi.fn<ApproveDeps['saveApproval']>(async () => undefined)
  const notifyApproved = vi.fn<ApproveDeps['notifyApproved']>(async () => undefined)
  const deps: ApproveDeps = {
    findThread: async () => t,
    findThreadPayment: async () => (hasPayment ? { purchaseId: 'purchase-1' } : null),
    capturePayment,
    saveApproval,
    notifyApproved,
  }
  return { deps, capturePayment, saveApproval, notifyApproved }
}

const setupDecline = (t: Thread = thread, voided = true, hasPayment = true) => {
  const voidPayment = vi.fn<DeclineDeps['voidPayment']>(async () =>
    voided ? ok(null) : err('void_failed')
  )
  const saveDecline = vi.fn<DeclineDeps['saveDecline']>(async () => undefined)
  const notifyDeclined = vi.fn<DeclineDeps['notifyDeclined']>(async () => undefined)
  const deps: DeclineDeps = {
    findThread: async () => t,
    findThreadPayment: async () => (hasPayment ? { purchaseId: 'purchase-1' } : null),
    voidPayment,
    saveDecline,
    notifyDeclined,
  }
  return { deps, voidPayment, saveDecline, notifyDeclined }
}

describe('approveApplication', () => {
  it('支払いを確定してから、承認した時点から30日のレッスンを始め、生徒に知らせる', async () => {
    const { deps, capturePayment, saveApproval, notifyApproved } = setupApprove()
    expect(await approveApplication({ actor: coach, threadId: 'thread-1', now }, deps)).toEqual({
      ok: true,
      value: { threadId: 'thread-1' },
    })
    expect(capturePayment).toHaveBeenCalledWith('purchase-1')
    expect(saveApproval).toHaveBeenCalledWith('thread-1', {
      status: 'waiting_coach',
      startedAt: now,
      expiresAt: new Date('2026-12-21T00:00:00Z'),
      decidedAt: now,
    })
    expect(notifyApproved).toHaveBeenCalledWith({
      threadId: 'thread-1',
      studentUserId: 'student-1',
    })
  })

  it('担当でないコーチは受けられない', async () => {
    const { deps, capturePayment } = setupApprove()
    const result = await approveApplication(
      { actor: { userId: 'other', name: '' }, threadId: 'thread-1', now },
      deps
    )
    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(capturePayment).not.toHaveBeenCalled()
  })

  it('期限（48時間）を過ぎたら受けられず、請求もしない', async () => {
    const { deps, capturePayment } = setupApprove()
    const late = new Date('2026-11-22T00:00:00Z')
    expect(
      await approveApplication({ actor: coach, threadId: 'thread-1', now: late }, deps)
    ).toEqual({ ok: false, error: 'approval_expired' })
    expect(capturePayment).not.toHaveBeenCalled()
  })

  it('承認待ちでない申し込みは受けられず、請求もしない', async () => {
    const { deps, capturePayment, saveApproval } = setupApprove({
      ...thread,
      status: 'waiting_coach',
    })
    expect(await approveApplication({ actor: coach, threadId: 'thread-1', now }, deps)).toEqual({
      ok: false,
      error: 'not_requested',
    })
    expect(capturePayment).not.toHaveBeenCalled()
    expect(saveApproval).not.toHaveBeenCalled()
  })

  it('支払いの記録がなければ受けられず、請求もしない', async () => {
    const { deps, capturePayment, saveApproval, notifyApproved } = setupApprove(thread, true, false)
    expect(await approveApplication({ actor: coach, threadId: 'thread-1', now }, deps)).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(capturePayment).not.toHaveBeenCalled()
    expect(saveApproval).not.toHaveBeenCalled()
    expect(notifyApproved).not.toHaveBeenCalled()
  })

  it('支払いを確定できなければ、承認待ちのまま', async () => {
    const { deps, saveApproval, notifyApproved } = setupApprove(thread, false)
    expect(await approveApplication({ actor: coach, threadId: 'thread-1', now }, deps)).toEqual({
      ok: false,
      error: 'capture_failed',
    })
    expect(saveApproval).not.toHaveBeenCalled()
    expect(notifyApproved).not.toHaveBeenCalled()
  })
})

describe('declineApplication', () => {
  const params = {
    actor: coach,
    threadId: 'thread-1',
    reason: 'out_of_scope' as const,
    message: ' アプローチが得意なコーチをおすすめします ',
    now,
  }

  it('カードの仮押さえを外してから、理由とひとことを残し、生徒に知らせる', async () => {
    const { deps, voidPayment, saveDecline, notifyDeclined } = setupDecline()
    expect((await declineApplication(params, deps)).ok).toBe(true)
    expect(voidPayment).toHaveBeenCalledWith('purchase-1')
    expect(saveDecline).toHaveBeenCalledWith('thread-1', {
      reason: 'out_of_scope',
      message: 'アプローチが得意なコーチをおすすめします',
      decidedAt: now,
    })
    expect(notifyDeclined).toHaveBeenCalledWith({
      threadId: 'thread-1',
      studentUserId: 'student-1',
    })
  })

  it('担当でないコーチは断れず、仮押さえも外さない', async () => {
    const { deps, voidPayment, saveDecline } = setupDecline()
    expect(
      await declineApplication({ ...params, actor: { userId: 'other', name: '' } }, deps)
    ).toEqual({ ok: false, error: 'not_found' })
    expect(voidPayment).not.toHaveBeenCalled()
    expect(saveDecline).not.toHaveBeenCalled()
  })

  it('承認待ちでない申し込みは断れず、仮押さえも外さない', async () => {
    const { deps, voidPayment, saveDecline } = setupDecline({ ...thread, status: 'waiting_coach' })
    expect(await declineApplication(params, deps)).toEqual({ ok: false, error: 'not_requested' })
    expect(voidPayment).not.toHaveBeenCalled()
    expect(saveDecline).not.toHaveBeenCalled()
  })

  it('支払いの記録がなければ断れず、仮押さえにも触らない', async () => {
    const { deps, voidPayment, saveDecline, notifyDeclined } = setupDecline(thread, true, false)
    expect(await declineApplication(params, deps)).toEqual({ ok: false, error: 'not_found' })
    expect(voidPayment).not.toHaveBeenCalled()
    expect(saveDecline).not.toHaveBeenCalled()
    expect(notifyDeclined).not.toHaveBeenCalled()
  })

  it('期限（48時間）を過ぎていても、断ることはでき、仮押さえを外す', async () => {
    const { deps, voidPayment, saveDecline } = setupDecline()
    const late = new Date('2026-11-23T00:00:00Z')
    expect(await declineApplication({ ...params, now: late }, deps)).toEqual({
      ok: true,
      value: { threadId: 'thread-1' },
    })
    expect(voidPayment).toHaveBeenCalledWith('purchase-1')
    expect(saveDecline).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({ decidedAt: late })
    )
  })

  it('ひとことは200文字まで', async () => {
    const { deps, voidPayment } = setupDecline()
    expect(await declineApplication({ ...params, message: 'あ'.repeat(201) }, deps)).toEqual({
      ok: false,
      error: 'message_too_long',
    })
    expect(voidPayment).not.toHaveBeenCalled()
  })

  it('仮押さえを外せなければ、承認待ちのまま', async () => {
    const { deps, saveDecline } = setupDecline(thread, false)
    expect(await declineApplication(params, deps)).toEqual({ ok: false, error: 'void_failed' })
    expect(saveDecline).not.toHaveBeenCalled()
  })
})
