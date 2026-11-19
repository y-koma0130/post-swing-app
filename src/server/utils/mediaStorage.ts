import 'server-only'
import { env } from 'cloudflare:workers'
import { toByteRange } from '@/server/utils/byteRange'

/**
 * 動画・画像の置き場所（R2）。バケットは非公開のまま使い、配信は権限を確かめた Route Handler から行う。
 * スレッドの動画・カードの画像と、ドリルの動画で共有する
 */

export type PutMediaObject = (
  r2Key: string,
  body: ReadableStream | ArrayBuffer,
  contentType: string
) => Promise<void>
export const putMediaObject: PutMediaObject = async (r2Key, body, contentType) => {
  await env.MEDIA.put(r2Key, body, { httpMetadata: { contentType } })
}

/**
 * R2 から返す。Range（動画のシーク）と If-None-Match に対応する
 * Safari は Range に 206 で応えないと動画を再生しない
 */
export const respondWithMediaObject = async (
  r2Key: string,
  contentType: string,
  request: Request
): Promise<Response> => {
  const object = await env.MEDIA.get(r2Key, { range: request.headers, onlyIf: request.headers })
  if (object === null) {
    return new Response('見つかりません', { status: 404 })
  }
  const headers = new Headers({
    'content-type': contentType,
    'accept-ranges': 'bytes',
    etag: object.httpEtag,
    // 本人だけが見るものなので、共有のキャッシュには置かせない
    'cache-control': 'private, max-age=3600',
  })
  if (!('body' in object)) {
    return new Response(null, { status: 304, headers })
  }
  const range = object.range
  if (range && request.headers.has('range')) {
    const { start, end } = toByteRange(range, object.size)
    headers.set('content-range', `bytes ${start}-${end}/${object.size}`)
    headers.set('content-length', String(end - start + 1))
    return new Response(object.body, { status: 206, headers })
  }
  headers.set('content-length', String(object.size))
  return new Response(object.body, { status: 200, headers })
}

export type DeleteMediaObject = (r2Key: string) => Promise<void>
export const deleteMediaObject: DeleteMediaObject = async (r2Key) => {
  await env.MEDIA.delete(r2Key)
}
