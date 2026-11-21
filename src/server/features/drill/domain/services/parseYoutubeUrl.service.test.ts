import { describe, expect, it } from 'vitest'
import { parseYoutubeUrl } from './parseYoutubeUrl.service'

const ID = 'dQw4w9WgXcQ'

describe('parseYoutubeUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `https://m.youtube.com/watch?v=${ID}&feature=share`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abcdef`,
    `https://www.youtube.com/live/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `  https://youtu.be/${ID}  `,
  ])('%s から動画 ID を取り出す', (url) => {
    expect(parseYoutubeUrl(url)).toEqual({ youtubeId: ID, startSec: 0, vertical: false })
  })

  it.each([
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
  ])('Shorts の %s は縦の動画にする', (url) => {
    expect(parseYoutubeUrl(url)).toEqual({ youtubeId: ID, startSec: 0, vertical: true })
  })

  it.each([
    [`https://youtu.be/${ID}?t=90`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=90s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1m30s`, 90],
    [`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`, 3723],
    [`https://www.youtube.com/embed/${ID}?start=45`, 45],
    [`https://youtu.be/${ID}?t=abc`, 0],
  ])('%s の開始位置を秒にする', (url, startSec) => {
    expect(parseYoutubeUrl(url)?.startSec).toBe(startSec)
  })

  it.each([
    '',
    'タオルドリル',
    `https://example.com/watch?v=${ID}`,
    'https://www.youtube.com/@coach',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/playlist?list=PL123',
    `https://www.instagram.com/reel/${ID}/`,
  ])('YouTube の動画の URL でなければ null（%s）', (url) => {
    expect(parseYoutubeUrl(url)).toBeNull()
  })
})
