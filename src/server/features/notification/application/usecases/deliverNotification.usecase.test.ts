import { describe, expect, it, vi } from 'vitest'
import { deliverNotification } from './deliverNotification.usecase'

type Deps = Parameters<typeof deliverNotification>[1]

const ctx = {
  coachName: '山田 太郎',
  coachSlug: 'yamada',
  coachUserId: 'coach-1',
  studentName: '佐藤',
  studentUserId: 'student-1',
  expiresAt: new Date('2026-12-14T00:00:00Z'),
}

const setup = (overrides: Partial<Omit<Deps, 'sendLinePush' | 'sendEmail'>> = {}) => {
  const sendLinePush = vi.fn<Deps['sendLinePush']>(async () => undefined)
  const sendEmail = vi.fn<Deps['sendEmail']>(async () => undefined)
  const deps: Deps = {
    findContext: async () => ctx,
    findLineRecipient: async () => ({ lineUserId: 'U123', isFriend: true }),
    findEmail: async () => 'coach@example.com',
    appUrl: 'https://swingpost.example',
    ...overrides,
    sendLinePush,
    sendEmail,
  }
  return { deps, sendLinePush, sendEmail }
}

describe('deliverNotification', () => {
  it('添削が届いたら、生徒に LINE で閲覧ページの URL を送る', async () => {
    const { deps, sendLinePush } = setup()
    const result = await deliverNotification(
      { kind: 'reply_sent', threadId: 't1', studentUserId: 'student-1' },
      deps
    )
    expect(result).toEqual({ ok: true, value: { sent: true } })
    expect(sendLinePush).toHaveBeenCalledWith(
      'U123',
      '山田 太郎さんから添削が届きました。\nhttps://swingpost.example/t/t1'
    )
  })

  it('動画が届いたら、コーチにメールで添削画面の URL を送る', async () => {
    const { deps, sendEmail, sendLinePush } = setup()
    await deliverNotification(
      { kind: 'video_submitted', threadId: 't1', coachUserId: 'coach-1' },
      deps
    )
    expect(sendLinePush).not.toHaveBeenCalled()
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: 'coach@example.com',
      subject: '佐藤さんから動画が届きました',
    })
    expect(sendEmail.mock.calls[0]?.[0].text).toContain(
      'https://swingpost.example/coach/threads/t1'
    )
  })

  it('コーチを招待したら、ログイン画面の URL をメールで送る', async () => {
    const { deps, sendEmail } = setup()
    await deliverNotification({ kind: 'coach_invited', coachUserId: 'coach-1' }, deps)
    expect(sendEmail.mock.calls[0]?.[0]).toMatchObject({
      to: 'coach@example.com',
      subject: 'SwingPost にコーチとして招待されました',
    })
    expect(sendEmail.mock.calls[0]?.[0].text).toContain('https://swingpost.example/coach/login')
  })

  it('LINE の友だちでなければ送らない', async () => {
    const { deps, sendLinePush } = setup({
      findLineRecipient: async () => ({ lineUserId: 'U123', isFriend: false }),
    })
    const result = await deliverNotification(
      { kind: 'reply_sent', threadId: 't1', studentUserId: 'student-1' },
      deps
    )
    expect(result).toEqual({ ok: true, value: { sent: false, reason: 'not_line_friend' } })
    expect(sendLinePush).not.toHaveBeenCalled()
  })

  it('LINE で登録していない生徒には送らない', async () => {
    const { deps } = setup({ findLineRecipient: async () => null })
    const result = await deliverNotification(
      { kind: 'reply_sent', threadId: 't1', studentUserId: 'student-1' },
      deps
    )
    expect(result).toEqual({ ok: true, value: { sent: false, reason: 'no_line_account' } })
  })

  it('チャットは、生徒からならコーチにメール、コーチからなら生徒に LINE', async () => {
    const a = setup()
    await deliverNotification(
      { kind: 'chat_message', threadId: 't1', to: 'coach', recipientUserId: 'coach-1' },
      a.deps
    )
    expect(a.sendEmail).toHaveBeenCalledOnce()
    const b = setup()
    await deliverNotification(
      { kind: 'chat_message', threadId: 't1', to: 'student', recipientUserId: 'student-1' },
      b.deps
    )
    expect(b.sendLinePush).toHaveBeenCalledOnce()
  })

  it('空きが出たら、申し込み画面の URL を送る', async () => {
    const { deps, sendLinePush } = setup()
    await deliverNotification(
      { kind: 'waitlist_opened', coachUserId: 'coach-1', studentUserId: 'student-1' },
      deps
    )
    expect(sendLinePush.mock.calls[0]?.[1]).toContain('https://swingpost.example/c/yamada/apply')
  })
})
