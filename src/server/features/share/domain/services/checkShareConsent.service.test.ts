import { describe, expect, it } from 'vitest'
import { NO_SHARE_CONSENT } from '../values/ShareConsent'
import { checkShareConsent } from './checkShareConsent.service'

const all = { allowPublish: true, showFace: true, showAgeRange: true, showScore: true }

describe('checkShareConsent', () => {
  it('18歳以上なら、選んだとおりに許可する', () => {
    expect(checkShareConsent({ choices: { ...all, showFace: false }, ageRange: '40s' })).toEqual({
      ok: true,
      value: { ...all, showFace: false },
    })
  })

  it('18歳未満・年代が分からない生徒は、公開を許可できない', () => {
    expect(checkShareConsent({ choices: all, ageRange: 'under_18' })).toEqual({
      ok: false,
      error: 'not_adult',
    })
    expect(checkShareConsent({ choices: all, ageRange: null })).toEqual({
      ok: false,
      error: 'not_adult',
    })
  })

  it('公開しないなら、ほかの項目も「出さない」にそろえる（18歳未満でも選べる）', () => {
    expect(
      checkShareConsent({ choices: { ...all, allowPublish: false }, ageRange: 'under_18' })
    ).toEqual({ ok: true, value: NO_SHARE_CONSENT })
  })
})
