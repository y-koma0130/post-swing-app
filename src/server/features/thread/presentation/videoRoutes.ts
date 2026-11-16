import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { findCoachAvailabilityFacts } from '@/server/features/coach/public'
import { authorizeVideo } from '../application/usecases/authorizeVideo.usecase'
import { type UploadVideoError, uploadVideo } from '../application/usecases/uploadVideo.usecase'
import {
  putMediaObject,
  respondWithMediaObject,
} from '../infrastructure/external-services/videoStorage'
import {
  findStoredVideo,
  findThread,
  saveDraftVideo,
} from '../infrastructure/repositories/threadRepository'

const UPLOAD_ERROR = {
  not_found: { status: 404, message: 'スレッドが見つかりません' },
  closed: { status: 409, message: 'このスレッドは終了しています' },
  expired: { status: 409, message: 'このスレッドは期限が切れています' },
  awaiting_reply: { status: 409, message: 'コーチの添削が届いてから、次を提出できます' },
  submission_limit: { status: 409, message: 'このスレッドで提出できる回数に達しています' },
  unsupported_type: { status: 415, message: '動画のファイル（mp4・mov・webm）を選んでください' },
  too_large: { status: 413, message: '動画は100MBまでです。短く切ってから送ってください' },
  too_long: { status: 413, message: '動画は1本60秒までです。短く切ってから送ってください' },
  invalid_angle: { status: 400, message: '撮った角度を選んでください' },
} as const satisfies Record<UploadVideoError, { status: number; message: string }>

/** 数でなければ null。範囲の確認はユースケースで行う */
const parseNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 提出に使う動画を1本受け取って R2 に保存する（下書き。提出は submitSubmissionAction でまとめて確定する）
 *
 * 本体は multipart にせずそのまま送ってもらい、R2 へ流す（Worker のメモリに載せない）。
 * 角度・長さ・フレームレートはヘッダーで受ける
 */
export const handleVideoUpload = async (request: Request, threadId: string): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return Response.json({ message: 'ログインし直してください' }, { status: 401 })
  }
  const sizeBytes = Number(request.headers.get('content-length') ?? '0')
  const body = request.body
  if (!body || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return Response.json({ message: '動画が空です' }, { status: 411 })
  }

  const result = await uploadVideo(
    {
      actor,
      threadId,
      contentType: (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '',
      sizeBytes,
      angle: request.headers.get('x-video-angle') ?? '',
      durationSec: parseNumber(request.headers.get('x-video-duration')),
      frameRate: parseNumber(request.headers.get('x-video-frame-rate')),
      now: new Date(),
    },
    {
      findThread,
      findCoachAvailabilityFacts,
      storeVideo: (r2Key, contentType) => putMediaObject(r2Key, body, contentType),
      saveDraftVideo,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    const { status, message } = UPLOAD_ERROR[result.error]
    return Response.json({ message }, { status })
  }
  return Response.json({ videoId: result.value.videoId }, { status: 201 })
}

/** 動画を返す。担当のコーチと本人の生徒だけ */
export const handleVideoDownload = async (request: Request, videoId: string): Promise<Response> => {
  const actor = await getActor()
  if (!actor) {
    return new Response('見つかりません', { status: 404 })
  }
  const result = await authorizeVideo({ actor, videoId }, { findStoredVideo })
  if (!result.ok) {
    return new Response('見つかりません', { status: 404 })
  }
  return respondWithMediaObject(result.value.r2Key, result.value.contentType, request)
}
