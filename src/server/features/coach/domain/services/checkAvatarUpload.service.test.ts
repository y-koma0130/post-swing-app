import { describe, expect, it } from 'vitest'
import { AVATAR_RULES } from '../rules'
import { checkAvatarUpload } from './checkAvatarUpload.service'

describe('checkAvatarUpload', () => {
  it('JPEG・PNG で上限以内なら受け付ける', () => {
    expect(checkAvatarUpload({ contentType: 'image/jpeg', sizeBytes: 100_000 })).toBeNull()
    expect(
      checkAvatarUpload({ contentType: 'image/png', sizeBytes: AVATAR_RULES.maxBytes })
    ).toBeNull()
  })

  it('JPEG・PNG 以外は受け付けない', () => {
    expect(checkAvatarUpload({ contentType: 'image/webp', sizeBytes: 100_000 })).toBe(
      'unsupported_type'
    )
  })

  it('上限を1バイトでも超えたら受け付けない', () => {
    expect(
      checkAvatarUpload({ contentType: 'image/jpeg', sizeBytes: AVATAR_RULES.maxBytes + 1 })
    ).toBe('too_large')
  })

  it('空のファイルは受け付けない', () => {
    expect(checkAvatarUpload({ contentType: 'image/jpeg', sizeBytes: 0 })).toBe('too_large')
  })
})
