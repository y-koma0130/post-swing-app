import { describe, expect, it } from 'vitest'
import { findMessageVideoLinks, splitMessageUrls } from './messageLinks'

describe('splitMessageUrls', () => {
  it('本文を文字と URL に分ける', () => {
    expect(splitMessageUrls('これを見て https://youtu.be/dQw4w9WgXcQ 参考に')).toEqual([
      { kind: 'text', text: 'これを見て ' },
      { kind: 'url', url: 'https://youtu.be/dQw4w9WgXcQ' },
      { kind: 'text', text: ' 参考に' },
    ])
  })

  it('URL の後ろの句読点・かっこは URL に含めない', () => {
    expect(splitMessageUrls('（https://example.com/a）。https://example.com/b.')).toEqual([
      { kind: 'text', text: '（' },
      { kind: 'url', url: 'https://example.com/a' },
      { kind: 'text', text: '）。' },
      { kind: 'url', url: 'https://example.com/b' },
      { kind: 'text', text: '.' },
    ])
  })

  it('URL がなければそのまま', () => {
    expect(splitMessageUrls('右ひざを意識して')).toEqual([
      { kind: 'text', text: '右ひざを意識して' },
    ])
  })
})

describe('findMessageVideoLinks', () => {
  it('YouTube と Instagram を取り出し、ほかの URL は無視する', () => {
    expect(
      findMessageVideoLinks(
        'https://example.com/ と https://youtu.be/dQw4w9WgXcQ?t=30\nhttps://www.instagram.com/reel/C1a2B3c4D5e/'
      )
    ).toEqual([
      { kind: 'youtube', youtubeId: 'dQw4w9WgXcQ', startSec: 30, vertical: false },
      { kind: 'instagram', postKind: 'reel', shortcode: 'C1a2B3c4D5e' },
    ])
  })

  it('同じ動画は1つにまとめ、最初の3つまで', () => {
    const urls = [
      'https://youtu.be/aaaaaaaaaaa',
      'https://www.youtube.com/watch?v=aaaaaaaaaaa',
      'https://youtu.be/bbbbbbbbbbb',
      'https://youtu.be/ccccccccccc',
      'https://youtu.be/ddddddddddd',
    ].join(' ')
    expect(findMessageVideoLinks(urls).map((l) => l.kind === 'youtube' && l.youtubeId)).toEqual([
      'aaaaaaaaaaa',
      'bbbbbbbbbbb',
      'ccccccccccc',
    ])
  })
})
