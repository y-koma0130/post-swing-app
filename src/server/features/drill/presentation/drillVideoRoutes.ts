import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isCoach } from '@/server/features/coach/public'
import { putMediaObject, respondWithMediaObject } from '@/server/utils/mediaStorage'
import { authorizeDrillVideo } from '../application/usecases/authorizeDrillVideo.usecase'
import {
  type UploadDrillVideoError,
  uploadDrillVideo,
} from '../application/usecases/uploadDrillVideo.usecase'
import {
  findDrillVideo,
  hasReceivedDrillVideo,
} from '../infrastructure/query-services/drillVideoAccess'
import { saveDrillVideo } from '../infrastructure/repositories/drillRepository'

const UPLOAD_ERROR = {
  not_found: { status: 403, message: 'コーチとしてログインしてください' },
  unsupported_type: { status: 415, message: '動画のファイル（mp4・mov・webm）を選んでください' },
  too_large: { status: 413, message: '動画は100MBまでです。短く切ってから送ってください' },
  too_long: { status: 413, message: '動画は1本60秒までです。短く切ってから送ってください' },
} as const satisfies Record<UploadDrillVideoError, { status: number; message: string }>

/** 数でなければ null。範囲の確認はユースケースで行う */
const parseNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * ドリルのお手本の動画を1本受け取って R2 に保存する（下書き。createDrillAction でドリルにひも付く）。
 * スレッドの動画と同じく、本体はそのまま R2 へ流し、長さ・フレームレートはヘッダーで受ける
 */
export const handleDrillVideoUpload = async (request: Request): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return Response.json({ message: 'ログインし直してください' }, { status: 401 })
  }
  const sizeBytes = Number(request.headers.get('content-length') ?? '0')
  const body = request.body
  if (!body || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return Response.json({ message: '動画が空です' }, { status: 411 })
  }
  const contentType = (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
  const result = await uploadDrillVideo(
    {
      actor,
      contentType,
      sizeBytes,
      durationSec: parseNumber(request.headers.get('x-video-duration')),
      frameRate: parseNumber(request.headers.get('x-video-frame-rate')),
      now: new Date(),
    },
    {
      isCoach,
      storeVideo: (r2Key, type) => putMediaObject(r2Key, body, type),
      saveDrillVideo,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    const { status, message } = UPLOAD_ERROR[result.error]
    return Response.json({ message }, { status })
  }
  return Response.json({ videoId: result.value.videoId }, { status: 201 })
}

/** ドリルの動画を返す。上げたコーチと、受け取った生徒だけ */
export const handleDrillVideoDownload = async (
  request: Request,
  videoId: string
): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return new Response('見つかりません', { status: 404 })
  }
  const result = await authorizeDrillVideo(
    { actor, videoId },
    { findDrillVideo, hasReceivedDrillVideo }
  )
  if (!result.ok) {
    return new Response('見つかりません', { status: 404 })
  }
  return respondWithMediaObject(result.value.r2Key, result.value.contentType, request)
}
