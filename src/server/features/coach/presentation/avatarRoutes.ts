import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { setCoachAvatar } from '../application/usecases/setCoachAvatar.usecase'
import type { AvatarBlocker } from '../domain/services/checkAvatarUpload.service'
import {
  deleteAvatar,
  getAvatar,
  putAvatar,
} from '../infrastructure/external-services/avatarStorage'
import {
  findAvatarKey,
  findAvatarKeyBySlug,
  isCoach,
  saveAvatarKey,
} from '../infrastructure/repositories/coachRepository'

const ERROR = {
  not_found: { status: 404, message: 'コーチとして登録されていません' },
  unsupported_type: { status: 415, message: 'JPEG か PNG の画像を選んでください' },
  too_large: { status: 413, message: '画像が大きすぎます' },
} as const satisfies Record<'not_found' | AvatarBlocker, { status: number; message: string }>

const deps = (body: ReadableStream | null) => ({
  isCoach,
  findAvatarKey,
  storeAvatar: async (r2Key: string, contentType: string) => {
    if (!body) throw new Error('画像が空です')
    await putAvatar(r2Key, body, contentType)
  },
  saveAvatarKey,
  deleteAvatarObject: deleteAvatar,
  generateId: () => crypto.randomUUID(),
})

/** コーチが自分のプロフィール画像を送る（本体はそのまま R2 へ流す） */
export const handleAvatarUpload = async (request: Request): Promise<Response> => {
  const actor = await getActor()
  if (!actor) return Response.json({ message: 'ログインし直してください' }, { status: 401 })
  const result = await setCoachAvatar(
    {
      actor,
      upload: {
        contentType: (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '',
        sizeBytes: Number(request.headers.get('content-length') ?? '0'),
      },
    },
    deps(request.body)
  )
  if (!result.ok) {
    const { status, message } = ERROR[result.error]
    return Response.json({ message }, { status })
  }
  return Response.json({ ok: true })
}

/** コーチが自分のプロフィール画像を外す */
export const handleAvatarDelete = async (): Promise<Response> => {
  const actor = await getActor()
  if (!actor) return Response.json({ message: 'ログインし直してください' }, { status: 401 })
  const result = await setCoachAvatar({ actor, upload: null }, deps(null))
  if (!result.ok) {
    return Response.json({ message: ERROR[result.error].message }, { status: 404 })
  }
  return Response.json({ ok: true })
}

/**
 * プロフィール画像を返す（受付ページに出すので、誰でも見られる）
 * URL に画像ごとの版が入るので、長くキャッシュしてよい
 */
export const handleAvatarGet = async (slug: string): Promise<Response> => {
  const key = await findAvatarKeyBySlug(slug)
  const image = key ? await getAvatar(key) : null
  if (!image) return new Response('見つかりません', { status: 404 })
  return new Response(image.body, {
    headers: {
      'content-type': image.contentType,
      etag: image.etag,
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}
