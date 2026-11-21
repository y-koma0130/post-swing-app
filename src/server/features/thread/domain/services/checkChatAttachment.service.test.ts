import { describe, expect, it } from 'vitest'
import { parseVideoLink } from '@/server/features/drill/domain/services/parseVideoLink.service'
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
  link: null,
  youtubeStatus: null,
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

  it('YouTube の動画は、埋め込みで再生できるものなら送れる', () => {
    const request = { kind: 'link' as const, url: 'https://youtu.be/dQw4w9WgXcQ?t=90' }
    const link = parseVideoLink(request.url)
    expect(checkChatAttachment({ ...base, request, link, youtubeStatus: 'playable' })).toEqual({
      ok: true,
      value: { kind: 'youtube', youtubeId: 'dQw4w9WgXcQ', startSec: 90, vertical: false },
    })
    // YouTube に問い合わせられないときは止めない
    expect(checkChatAttachment({ ...base, request, link, youtubeStatus: 'unknown' }).ok).toBe(true)
    expect(checkChatAttachment({ ...base, request, link, youtubeStatus: 'unavailable' })).toEqual({
      ok: false,
      error: 'youtube_unavailable',
    })
  })

  it('Instagram の投稿は、確かめずに送れる', () => {
    const request = { kind: 'link' as const, url: 'https://www.instagram.com/reel/C1a2B3c4D5e/' }
    expect(checkChatAttachment({ ...base, request, link: parseVideoLink(request.url) })).toEqual({
      ok: true,
      value: { kind: 'instagram', postKind: 'reel', shortcode: 'C1a2B3c4D5e' },
    })
  })

  it('YouTube でも Instagram でもない URL は送れない', () => {
    const request = { kind: 'link' as const, url: 'https://example.com/' }
    expect(checkChatAttachment({ ...base, request, link: null })).toEqual({
      ok: false,
      error: 'invalid_link',
    })
  })
})
