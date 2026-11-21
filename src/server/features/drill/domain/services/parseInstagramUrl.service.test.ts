import { describe, expect, it } from 'vitest'
import { parseInstagramUrl } from './parseInstagramUrl.service'

const CODE = 'C1a2B3c4D5e'

describe('parseInstagramUrl', () => {
  it.each([
    [`https://www.instagram.com/reel/${CODE}/`, 'reel'],
    [`https://www.instagram.com/reel/${CODE}/?igsh=abc123`, 'reel'],
    [`https://instagram.com/reels/${CODE}`, 'reel'],
    [`https://www.instagram.com/p/${CODE}/`, 'p'],
    [`https://www.instagram.com/coach_yamada/p/${CODE}/`, 'p'],
    [`https://www.instagram.com/coach_yamada/reel/${CODE}/`, 'reel'],
    [`https://www.instagram.com/tv/${CODE}/`, 'tv'],
    [`https://instagr.am/p/${CODE}/`, 'p'],
    [`www.instagram.com/reel/${CODE}/`, 'reel'],
  ])('%s から投稿を取り出す', (url, postKind) => {
    expect(parseInstagramUrl(url)).toEqual({ postKind, shortcode: CODE })
  })

  it.each([
    '',
    'インスタのリール',
    'https://www.instagram.com/coach_yamada/',
    'https://www.instagram.com/stories/coach_yamada/123/',
    'https://www.instagram.com/reel/',
    `https://example.com/reel/${CODE}/`,
    'https://youtu.be/dQw4w9WgXcQ',
    `https://www.instagram.com/a/b/reel/${CODE}/`,
  ])('Instagram の投稿の URL でなければ null（%s）', (url) => {
    expect(parseInstagramUrl(url)).toBeNull()
  })
})
