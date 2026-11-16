import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { findCoachAvailabilityFacts } from '@/server/features/coach/public'
import { authorizeVideo } from '../application/usecases/authorizeVideo.usecase'
import {
  type UploadChatVideoError,
  uploadChatVideo,
} from '../application/usecases/uploadChatVideo.usecase'
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
} as const satisfies Record<
  UploadVideoError | UploadChatVideoError,
  { status: number; message: string }
>

/** 数でなければ null。範囲の確認はユースケースで行う */
const parseNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 動画を1本受け取って R2 に保存する（下書き）。生徒の提出の動画は submitSubmissionAction、
 * コーチがチャットに添える動画（?purpose=chat）は sendChatMessageAction で確定する
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

  const contentType = (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? ''
  const durationSec = parseNumber(request.headers.get('x-video-duration'))
  const frameRate = parseNumber(request.headers.get('x-video-frame-rate'))
  const storeVideo = (r2Key: string, type: string) => putMediaObject(r2Key, body, type)
  // コーチがチャットに添える動画（お手本など）
  const result =
    new URL(request.url).searchParams.get('purpose') === 'chat'
      ? await uploadChatVideo(
          { actor, threadId, contentType, sizeBytes, durationSec, frameRate, now: new Date() },
          { findThread, storeVideo, saveDraftVideo, generateId: () => crypto.randomUUID() }
        )
      : await uploadVideo(
          {
            actor,
            threadId,
            contentType,
            sizeBytes,
            angle: request.headers.get('x-video-angle') ?? '',
            durationSec,
            frameRate,
            now: new Date(),
          },
          {
            findThread,
            findCoachAvailabilityFacts,
            storeVideo,
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
