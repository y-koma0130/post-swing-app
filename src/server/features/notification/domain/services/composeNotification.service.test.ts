import { describe, expect, it } from 'vitest'
import type { NotificationMessage } from '../values/NotificationMessage'
import { composeNotification, type NotificationContext } from './composeNotification.service'

const ctx: NotificationContext = {
  appUrl: 'https://swingpost.app',
  coachName: '山田',
  coachSlug: 'yamada-golf',
  coachUserId: 'coach-1',
  studentName: '佐藤',
  studentUserId: 'student-1',
  expiresAt: new Date('2026-12-19T10:00:00+09:00'),
}

const t = 'th-1'

const replySent: NotificationMessage = {
  kind: 'reply_sent',
  threadId: t,
  studentUserId: 'student-1',
}
const threadExpiring: NotificationMessage = {
  kind: 'thread_expiring',
  threadId: t,
  studentUserId: 'student-1',
}
const videoSubmitted: NotificationMessage = {
  kind: 'video_submitted',
  threadId: t,
  coachUserId: 'coach-1',
}

/** 生徒あて（LINE）とコーチあて（メール）の出来事。すべての種類を1つずつ */
const toStudent: NotificationMessage[] = [
  replySent,
  { kind: 'chat_message', threadId: t, to: 'student', recipientUserId: 'student-1' },
  { kind: 'thread_closed', threadId: t, studentUserId: 'student-1' },
  threadExpiring,
  { kind: 'waitlist_opened', coachUserId: 'coach-1', studentUserId: 'student-1' },
  { kind: 'application_approved', threadId: t, studentUserId: 'student-1' },
  { kind: 'application_declined', threadId: t, studentUserId: 'student-1' },
  { kind: 'application_expired', threadId: t, studentUserId: 'student-1' },
  { kind: 'retake_requested', threadId: t, studentUserId: 'student-1' },
]
const toCoach: NotificationMessage[] = [
  { kind: 'chat_message', threadId: t, to: 'coach', recipientUserId: 'coach-1' },
  videoSubmitted,
  { kind: 'application_received', threadId: t, coachUserId: 'coach-1' },
  { kind: 'retake_sent', threadId: t, coachUserId: 'coach-1' },
  { kind: 'retake_declined', threadId: t, coachUserId: 'coach-1' },
  { kind: 'thread_started', threadId: t, coachUserId: 'coach-1' },
  { kind: 'reply_overdue', threadId: t, coachUserId: 'coach-1' },
  { kind: 'absence_ended', coachUserId: 'coach-1', submissionCount: 2, chatCount: 1 },
  { kind: 'coach_invited', coachUserId: 'coach-1' },
]

describe('composeNotification', () => {
  it.each(toStudent.map((m) => [m.kind, m] as const))('%s は生徒に LINE で送る', (_, message) => {
    const result = composeNotification(message, ctx)
    expect(result.channel).toBe('line')
    expect(result.recipientUserId).toBe('student-1')
    expect(result.text).toContain('https://swingpost.app/')
  })

  it.each(toCoach.map((m) => [m.kind, m] as const))('%s はコーチにメールで送る', (_, message) => {
    const result = composeNotification(message, ctx)
    expect(result.channel).toBe('email')
    expect(result.recipientUserId).toBe('coach-1')
    expect(result.text).toContain('https://swingpost.app/')
  })

  it('生徒あての URL はレッスンの画面、コーチあてはコーチの画面', () => {
    expect(composeNotification(replySent, ctx).text).toContain('https://swingpost.app/t/th-1')
    expect(composeNotification(videoSubmitted, ctx).text).toContain(
      'https://swingpost.app/coach/threads/th-1'
    )
  })

  it('まだ見ていないものが複数あれば、まとめて1通で知らせる', () => {
    const result = composeNotification(replySent, {
      ...ctx,
      unseen: { submissions: 0, replies: 1, messages: 2 },
    })
    expect(result.subject).toBe('添削とメッセージが届きました')
  })

  it('コーチには、生徒の添削の件数ではなく動画とメッセージをまとめる', () => {
    const result = composeNotification(videoSubmitted, {
      ...ctx,
      unseen: { submissions: 1, replies: 3, messages: 1 },
    })
    expect(result.subject).toBe('佐藤さんから動画とメッセージが届きました')
  })

  it('名前が空なら「生徒」「コーチ」と呼ぶ', () => {
    const result = composeNotification(videoSubmitted, { ...ctx, studentName: ' ' })
    expect(result.subject).toBe('生徒さんから動画が届きました')
    const toS = composeNotification(replySent, { ...ctx, coachName: '' })
    expect(toS.text.startsWith('コーチさんから')).toBe(true)
  })

  it('期限の通知には日付を入れる（日本時間）', () => {
    expect(composeNotification(threadExpiring, ctx).text).toContain('12/19')
  })

  describe('申し込みの通知は、無料（0円）なら請求の話をしない', () => {
    const received: NotificationMessage = {
      kind: 'application_received',
      threadId: t,
      coachUserId: 'coach-1',
    }
    const declined: NotificationMessage = {
      kind: 'application_declined',
      threadId: t,
      studentUserId: 'student-1',
    }
    const expired: NotificationMessage = {
      kind: 'application_expired',
      threadId: t,
      studentUserId: 'student-1',
    }

    it('有料なら、請求のことを書く', () => {
      expect(composeNotification(received, ctx).text).toContain('生徒への請求が確定')
      expect(composeNotification(declined, ctx).text).toContain('請求はされません')
      expect(composeNotification(expired, ctx).text).toContain('請求はされません')
    })

    it('無料なら、請求のことを書かない', () => {
      const free = { ...ctx, free: true }
      expect(composeNotification(received, free).text).toContain('無料のモニターの申し込み')
      for (const message of [received, declined, expired]) {
        expect(composeNotification(message, free).text).not.toContain('請求')
      }
    })
  })
})
