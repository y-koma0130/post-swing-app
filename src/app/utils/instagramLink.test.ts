import { describe, expect, it } from 'vitest'
import { instagramOpenUrl } from './instagramLink'

describe('instagramOpenUrl', () => {
  it('LINE の中から外のブラウザ（アプリ）で開くための印を付ける', () => {
    expect(instagramOpenUrl('https://www.instagram.com/reel/C1a2B3c4D5e/')).toBe(
      'https://www.instagram.com/reel/C1a2B3c4D5e/?openExternalBrowser=1'
    )
  })
})
