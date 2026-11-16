import { describe, expect, it } from 'vitest'
import { checkChatMessage } from './checkChatMessage.service'

const message = (from: 'coach' | 'student') => ({
  id: crypto.randomUUID(),
  videoId: 'v1',
  from,
  body: 'こんにちは',
  sentAt: new Date(),
})
const thread = { status: 'waiting_coach' as const, messages: [] }

describe('checkChatMessage', () => {
  it('前後の空白を除いた本文を返す', () => {
    expect(
      checkChatMessage({ thread, videoId: 'v1', sender: 'student', body: ' 質問です ' })
    ).toEqual({ ok: true, value: { body: '質問です' } })
  })

  it('終了したスレッド・空・長すぎる本文は送れない', () => {
    const check = (overrides: Partial<Parameters<typeof checkChatMessage>[0]>) =>
      checkChatMessage({ thread, videoId: 'v1', sender: 'coach', body: 'a', ...overrides })
    expect(check({ thread: { ...thread, status: 'closed' } })).toEqual({
      ok: false,
      error: 'closed',
    })
    expect(check({ body: '   ' })).toEqual({ ok: false, error: 'empty' })
    expect(check({ body: 'あ'.repeat(1001) })).toEqual({ ok: false, error: 'too_long' })
  })

  it('生徒は動画ごとの上限まで。コーチは無制限', () => {
    const full = {
      ...thread,
      messages: [message('student'), message('student'), message('student')],
    }
    expect(checkChatMessage({ thread: full, videoId: 'v1', sender: 'student', body: 'a' })).toEqual(
      {
        ok: false,
        error: 'limit_reached',
      }
    )
    expect(checkChatMessage({ thread: full, videoId: 'v1', sender: 'coach', body: 'a' }).ok).toBe(
      true
    )
    expect(checkChatMessage({ thread: full, videoId: 'v2', sender: 'student', body: 'a' }).ok).toBe(
      true
    )
  })
})
