import { describe, expect, it } from 'vitest'
import { checkChatMessage } from './checkChatMessage.service'

const message = (from: 'coach' | 'student') => ({
  id: crypto.randomUUID(),
  from,
  body: 'こんにちは',
  sentAt: new Date(),
  attachment: { kind: 'none' as const },
  quote: null,
})
const submission = {
  id: 's1',
  submittedAt: new Date(),
  note: '',
  videos: [{ id: 'v1', angle: 'front' as const }],
  replied: false,
}
const thread = {
  status: 'waiting_coach' as const,
  planKind: 'single' as const,
  submissions: [submission],
  messages: [],
}

describe('checkChatMessage', () => {
  it('前後の空白を除いた本文を返す', () => {
    expect(
      checkChatMessage({ thread, sender: 'student', body: ' 質問です ', attachmentKind: 'none' })
    ).toEqual({
      ok: true,
      value: { body: '質問です' },
    })
  })

  it('終了したスレッド・空・長すぎる本文は送れない', () => {
    const check = (overrides: Partial<Parameters<typeof checkChatMessage>[0]>) =>
      checkChatMessage({ thread, sender: 'coach', body: 'a', attachmentKind: 'none', ...overrides })
    expect(check({ thread: { ...thread, status: 'closed' } })).toEqual({
      ok: false,
      error: 'closed',
    })
    expect(check({ body: '   ' })).toEqual({ ok: false, error: 'empty' })
    expect(check({ body: 'あ'.repeat(1001) })).toEqual({ ok: false, error: 'too_long' })
  })

  it('生徒は最初の提出のあとから送れる。コーチはいつでも送れる', () => {
    const before = { ...thread, status: 'waiting_student' as const, submissions: [] }
    expect(
      checkChatMessage({ thread: before, sender: 'student', body: 'a', attachmentKind: 'none' })
    ).toEqual({
      ok: false,
      error: 'no_submission',
    })
    expect(
      checkChatMessage({ thread: before, sender: 'coach', body: 'a', attachmentKind: 'none' }).ok
    ).toBe(true)
  })

  it('生徒はスレッド全体の上限まで（お試しは10通）。コーチは無制限', () => {
    const full = {
      ...thread,
      planKind: 'trial' as const,
      messages: Array.from({ length: 10 }, () => message('student')),
    }
    expect(
      checkChatMessage({ thread: full, sender: 'student', body: 'a', attachmentKind: 'none' })
    ).toEqual({
      ok: false,
      error: 'limit_reached',
    })
    expect(
      checkChatMessage({ thread: full, sender: 'coach', body: 'a', attachmentKind: 'none' }).ok
    ).toBe(true)
    expect(
      checkChatMessage({
        thread: { ...full, planKind: 'single' },
        sender: 'student',
        body: 'a',
        attachmentKind: 'none',
      }).ok
    ).toBe(true)
  })

  it('コーチはドリル・動画を添えられ、添えれば本文なしでも送れる。生徒は添えられない', () => {
    expect(
      checkChatMessage({ thread, sender: 'coach', body: ' ', attachmentKind: 'drill' })
    ).toEqual({ ok: true, value: { body: '' } })
    expect(
      checkChatMessage({ thread, sender: 'coach', body: '', attachmentKind: 'video' }).ok
    ).toBe(true)
    expect(
      checkChatMessage({ thread, sender: 'student', body: '見て', attachmentKind: 'video' })
    ).toEqual({ ok: false, error: 'attachment_not_allowed' })
  })

  it('申し込みの下書き・承認待ちのあいだは、どちらも送れない。断られたら終了と同じ', () => {
    for (const status of ['draft', 'requested'] as const) {
      for (const sender of ['coach', 'student'] as const) {
        expect(
          checkChatMessage({
            thread: { ...thread, status },
            sender,
            body: '質問',
            attachmentKind: 'none',
          })
        ).toEqual({ ok: false, error: 'not_started' })
      }
    }
    expect(
      checkChatMessage({
        thread: { ...thread, status: 'declined' },
        sender: 'coach',
        body: '質問',
        attachmentKind: 'none',
      })
    ).toEqual({ ok: false, error: 'closed' })
  })
})
