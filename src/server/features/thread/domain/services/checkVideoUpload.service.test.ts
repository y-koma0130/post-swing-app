import { describe, expect, it } from 'vitest'
import { checkVideoUpload } from './checkVideoUpload.service'

const MB = 1024 * 1024
const base = {
  contentType: 'video/mp4',
  sizeBytes: 20 * MB,
  angle: 'front',
  durationSec: 12.5,
  frameRate: 119.88,
}

describe('checkVideoUpload', () => {
  it('受け付けて、角度・フレームレート・長さを返す', () => {
    expect(checkVideoUpload(base)).toEqual({
      ok: true,
      value: { angle: 'front', frameRate: 119.88, durationSec: 12.5 },
    })
  })

  it('形式と大きさ', () => {
    expect(checkVideoUpload({ ...base, contentType: 'image/png' })).toEqual({
      ok: false,
      error: 'unsupported_type',
    })
    expect(checkVideoUpload({ ...base, sizeBytes: 101 * MB })).toEqual({
      ok: false,
      error: 'too_large',
    })
    expect(checkVideoUpload({ ...base, sizeBytes: 0 })).toEqual({ ok: false, error: 'too_large' })
  })

  it('60秒まで。測れなかったときは止めない', () => {
    expect(checkVideoUpload({ ...base, durationSec: 60 }).ok).toBe(true)
    expect(checkVideoUpload({ ...base, durationSec: 60.5 })).toEqual({
      ok: false,
      error: 'too_long',
    })
    expect(checkVideoUpload({ ...base, durationSec: null })).toEqual({
      ok: true,
      value: { angle: 'front', frameRate: 119.88, durationSec: null },
    })
  })

  it('角度は正面・後方・その他のどれか', () => {
    expect(checkVideoUpload({ ...base, angle: 'back' }).ok).toBe(true)
    expect(checkVideoUpload({ ...base, angle: 'other' }).ok).toBe(true)
    expect(checkVideoUpload({ ...base, angle: 'side' })).toEqual({
      ok: false,
      error: 'invalid_angle',
    })
  })

  it('ありえないフレームレートは記録しない', () => {
    const result = checkVideoUpload({ ...base, frameRate: 5000 })
    expect(result.ok && result.value.frameRate).toBeNull()
  })
})
