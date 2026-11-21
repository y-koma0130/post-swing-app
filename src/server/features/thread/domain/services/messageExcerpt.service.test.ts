import { describe, expect, it } from 'vitest'
import { messageExcerpt } from './messageExcerpt.service'

describe('messageExcerpt', () => {
  it('本文があれば、本文の冒頭40文字', () => {
    expect(
      messageExcerpt({
        body: `  ${'あ'.repeat(50)}  `,
        attachmentKind: 'video',
        drillTitle: null,
      })
    ).toBe('あ'.repeat(40))
  })

  it.each([
    ['drill', 'ドリル：タオルドリル'],
    ['video', '動画'],
  ] as const)('本文がなければ添付の種類（%s）', (attachmentKind, excerpt) => {
    expect(messageExcerpt({ body: '', attachmentKind, drillTitle: 'タオルドリル' })).toBe(excerpt)
  })
})
