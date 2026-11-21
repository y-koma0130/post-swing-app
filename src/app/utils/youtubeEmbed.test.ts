import { describe, expect, it } from 'vitest'
import { formatStartSec, youtubeEmbedUrl } from './youtubeEmbed'

describe('youtubeEmbedUrl', () => {
  it('Cookie を付けない埋め込みの URL にする', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ', 0)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1'
    )
  })

  it('開始位置があれば start を付ける', () => {
    expect(youtubeEmbedUrl('dQw4w9WgXcQ', 90)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&playsinline=1&start=90'
    )
  })
})

describe('formatStartSec', () => {
  it.each([
    [0, '0:00'],
    [90, '1:30'],
    [3723, '1:02:03'],
  ])('%i 秒を %s にする', (sec, text) => {
    expect(formatStartSec(sec)).toBe(text)
  })
})
