import { describe, expect, it } from 'vitest'
import { checkVideoUpload } from './checkVideoUpload.service'

const MB = 1024 * 1024
const base = {
  thread: { videos: [] },
  contentType: 'video/mp4',
  sizeBytes: 20 * MB,
  note: '  ドライバーです  ',
  theme: 'トップで右ひざが流れる',
  frameRate: 119.88,
}
const replied = { id: 'v0', uploadedAt: new Date(), note: '', replied: true }

describe('checkVideoUpload', () => {
  it('最初の動画はテーマを受け取り、メモの前後の空白を除く', () => {
    expect(checkVideoUpload(base)).toEqual({
      ok: true,
      value: { note: 'ドライバーです', theme: 'トップで右ひざが流れる', frameRate: 119.88 },
    })
  })

  it('最初の動画でテーマが空なら受け付けない', () => {
    expect(checkVideoUpload({ ...base, theme: '  ' })).toEqual({
      ok: false,
      error: 'theme_required',
    })
  })

  it('2本目以降はテーマを変えない（空でもよい）', () => {
    const result = checkVideoUpload({ ...base, thread: { videos: [replied] }, theme: '' })
    expect(result.ok && result.value.theme).toBeNull()
  })

  it('動画以外・100MB超・長すぎるメモは受け付けない', () => {
    expect(checkVideoUpload({ ...base, contentType: 'image/png' }).ok).toBe(false)
    expect(checkVideoUpload({ ...base, sizeBytes: 101 * MB })).toEqual({
      ok: false,
      error: 'too_large',
    })
    expect(checkVideoUpload({ ...base, note: 'あ'.repeat(1001) })).toEqual({
      ok: false,
      error: 'note_too_long',
    })
  })

  it('ありえないフレームレートは記録しないが、受け付ける', () => {
    for (const frameRate of [0, -30, 5000, Number.NaN, null]) {
      const result = checkVideoUpload({ ...base, frameRate })
      expect(result.ok && result.value.frameRate).toBeNull()
    }
  })
})
