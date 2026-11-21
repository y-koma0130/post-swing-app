import { describe, expect, it } from 'vitest'
import { parseInstagramUrl } from '@/server/features/drill/domain/services/parseInstagramUrl.service'
import { parseYoutubeUrl } from '@/server/features/drill/domain/services/parseYoutubeUrl.service'
import { checkChatAttachment } from './checkChatAttachment.service'

const video = {
  id: 'v1',
  threadId: 't1',
  uploaderUserId: 'coach',
  submissionId: null,
  chatMessageId: null,
  angle: 'other' as const,
}
const base = {
  threadId: 't1',
  actorUserId: 'coach',
  ownDrill: null,
  video: null,
  youtube: null,
  instagram: null,
}

describe('checkChatAttachment', () => {
  it('添付なし', () => {
    expect(checkChatAttachment({ ...base, request: { kind: 'none' } })).toEqual({
      ok: true,
      value: { kind: 'none' },
    })
  })

  it('自分のドリルは中身を写して添えられる。見つからなければ添えられない', () => {
    const request = { kind: 'drill' as const, drillId: 'd1' }
    expect(
      checkChatAttachment({
        ...base,
        request,
        ownDrill: {
          title: '壁ドリル',
          description: '説明',
          video: { kind: 'upload' as const, videoId: 'dv1' },
        },
      })
    ).toEqual({
      ok: true,
      value: {
        kind: 'drill',
        title: '壁ドリル',
        description: '説明',
        video: { kind: 'upload' as const, videoId: 'dv1' },
      },
    })
    expect(checkChatAttachment({ ...base, request })).toEqual({ ok: false, error: 'invalid_drill' })
  })

  it('このレッスンに自分が上げた、未使用の動画だけ添えられる', () => {
    const request = { kind: 'video' as const, videoId: 'v1' }
    expect(checkChatAttachment({ ...base, request, video })).toEqual({
      ok: true,
      value: { kind: 'video', videoId: 'v1' },
    })
    const invalid = { ok: false, error: 'invalid_video' }
    expect(checkChatAttachment({ ...base, request })).toEqual(invalid)
    expect(checkChatAttachment({ ...base, request, video: { ...video, threadId: 't2' } })).toEqual(
      invalid
    )
    expect(
      checkChatAttachment({ ...base, request, video: { ...video, uploaderUserId: 'other' } })
    ).toEqual(invalid)
    expect(
      checkChatAttachment({ ...base, request, video: { ...video, chatMessageId: 'm' } })
    ).toEqual(invalid)
    expect(
      checkChatAttachment({ ...base, request, video: { ...video, submissionId: 's' } })
    ).toEqual(invalid)
  })

  it('YouTube は、動画の URL で、埋め込みで再生できるものなら送れる', () => {
    const request = { kind: 'youtube' as const, url: 'https://youtu.be/dQw4w9WgXcQ?t=90' }
    const parsed = parseYoutubeUrl(request.url)
    expect(
      checkChatAttachment({ ...base, request, youtube: { parsed, status: 'playable' } })
    ).toEqual({ ok: true, value: { kind: 'youtube', youtubeId: 'dQw4w9WgXcQ', startSec: 90 } })
    // YouTube に問い合わせられないときは止めない
    expect(
      checkChatAttachment({ ...base, request, youtube: { parsed, status: 'unknown' } }).ok
    ).toBe(true)
    expect(
      checkChatAttachment({ ...base, request, youtube: { parsed, status: 'unavailable' } })
    ).toEqual({ ok: false, error: 'youtube_unavailable' })
    expect(
      checkChatAttachment({ ...base, request, youtube: { parsed: null, status: null } })
    ).toEqual({ ok: false, error: 'invalid_youtube' })
  })

  it('Instagram は、投稿かリールの URL なら送れる', () => {
    const request = {
      kind: 'instagram' as const,
      url: 'https://www.instagram.com/reel/C1a2B3c4D5e/',
    }
    expect(
      checkChatAttachment({ ...base, request, instagram: parseInstagramUrl(request.url) })
    ).toEqual({
      ok: true,
      value: { kind: 'instagram', postKind: 'reel', shortcode: 'C1a2B3c4D5e' },
    })
    expect(checkChatAttachment({ ...base, request, instagram: null })).toEqual({
      ok: false,
      error: 'invalid_instagram',
    })
  })
})
