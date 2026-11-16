import { describe, expect, it } from 'vitest'
import { checkQuoteTarget } from './checkQuoteTarget.service'

const thread = {
  submissions: [
    {
      id: 's1',
      submittedAt: new Date(),
      note: '',
      videos: [
        { id: 'front-1', angle: 'front' as const },
        { id: 'back-1', angle: 'back' as const },
      ],
      replied: true,
    },
  ],
  messages: [
    {
      id: 'm1',
      from: 'student' as const,
      body: '  左手のグリップはこれで合っていますか？ 写真のように握っています。もう少し強く握るべきでしょうか  ',
      sentAt: new Date(),
      attachment: { kind: 'none' as const },
      quote: null,
    },
    {
      id: 'm2',
      from: 'coach' as const,
      body: '',
      sentAt: new Date(),
      attachment: { kind: 'video' as const, videoId: 'coach-video' },
      quote: null,
    },
    {
      id: 'm3',
      from: 'coach' as const,
      body: '',
      sentAt: new Date(),
      attachment: { kind: 'drill' as const, title: '壁ドリル', description: '' },
      quote: null,
    },
  ],
}
const cards = [{ id: 'c1', submissionId: 's1', position: 'top' as const }]
const check = (kind: 'video' | 'card' | 'message', targetId: string) =>
  checkQuoteTarget({ thread, cards, request: { kind, targetId } })

describe('checkQuoteTarget', () => {
  it('提出の動画は、何回目か・角度を写す', () => {
    expect(check('video', 'back-1')).toEqual({
      ok: true,
      value: { kind: 'video', targetId: 'back-1', submissionIndex: 0, angle: 'back' },
    })
  })

  it('コーチがチャットで送った動画も引用できる', () => {
    expect(check('video', 'coach-video')).toEqual({
      ok: true,
      value: { kind: 'video', targetId: 'coach-video', submissionIndex: null, angle: null },
    })
  })

  it('添削カードは、何回目か・キー位置を写す', () => {
    expect(check('card', 'c1')).toEqual({
      ok: true,
      value: { kind: 'card', targetId: 'c1', submissionIndex: 0, position: 'top' },
    })
  })

  it('メッセージは本文の冒頭40文字。添付だけなら添付の種類', () => {
    const quoted = check('message', 'm1')
    const body = thread.messages[0]?.body.trim() ?? ''
    expect(quoted.ok && quoted.value.kind === 'message' && quoted.value.excerpt).toBe(
      body.slice(0, 40)
    )
    expect(body.length).toBeGreaterThan(40)
    const drill = check('message', 'm3')
    expect(drill.ok && drill.value.kind === 'message' && drill.value.excerpt).toBe(
      'ドリル：壁ドリル'
    )
    const video = check('message', 'm2')
    expect(video.ok && video.value.kind === 'message' && video.value.excerpt).toBe('動画')
  })

  it('このスレッドにないものは引用できない', () => {
    const invalid = { ok: false, error: 'invalid_quote' }
    expect(check('video', 'x')).toEqual(invalid)
    expect(check('card', 'x')).toEqual(invalid)
    expect(check('message', 'x')).toEqual(invalid)
  })
})
