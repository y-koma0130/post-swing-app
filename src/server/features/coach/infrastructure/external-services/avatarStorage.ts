import 'server-only'
import { env } from 'cloudflare:workers'

/** プロフィール画像の置き場所（R2）。バケットは非公開のまま、Route Handler から返す */

export type PutAvatar = (r2Key: string, body: ReadableStream, contentType: string) => Promise<void>
export const putAvatar: PutAvatar = async (r2Key, body, contentType) => {
  await env.MEDIA.put(r2Key, body, { httpMetadata: { contentType } })
}

export type DeleteAvatar = (r2Key: string) => Promise<void>
export const deleteAvatar: DeleteAvatar = async (r2Key) => {
  await env.MEDIA.delete(r2Key)
}

export type GetAvatar = (
  r2Key: string
) => Promise<{ body: ReadableStream; contentType: string; etag: string } | null>
export const getAvatar: GetAvatar = async (r2Key) => {
  const object = await env.MEDIA.get(r2Key)
  if (!object) return null
  return {
    body: object.body,
    contentType: object.httpMetadata?.contentType ?? 'image/jpeg',
    etag: object.httpEtag,
  }
}

/** 画像のバイト列（SNS のカード画像に埋め込む） */
export const getAvatarBytes = async (r2Key: string): Promise<ArrayBuffer | null> => {
  const object = await env.MEDIA.get(r2Key)
  return object ? object.arrayBuffer() : null
}
