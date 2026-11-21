import { describe, expect, it } from 'vitest'
import { parseVideoLink } from './parseVideoLink.service'

describe('parseVideoLink', () => {
  it('YouTube の URL なら YouTube の動画にする', () => {
    expect(parseVideoLink('https://youtu.be/dQw4w9WgXcQ?t=30')).toEqual({
      kind: 'youtube',
      youtubeId: 'dQw4w9WgXcQ',
      startSec: 30,
      vertical: false,
    })
  })

  it('Instagram の URL なら Instagram の投稿にする', () => {
    expect(parseVideoLink('https://www.instagram.com/reel/C1a2B3c4D5e/')).toEqual({
      kind: 'instagram',
      postKind: 'reel',
      shortcode: 'C1a2B3c4D5e',
    })
  })

  it.each(['', 'タオルドリル', 'https://example.com/video'])(
    'どちらでもなければ null（%s）',
    (url) => {
      expect(parseVideoLink(url)).toBeNull()
    }
  )
})
