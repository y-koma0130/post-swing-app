import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { findCoachAvailabilityFacts } from '@/server/features/coach/public'
import { notify } from '@/server/features/notification/public'
import { authorizeVideo } from '../application/usecases/authorizeVideo.usecase'
import { type SubmitVideoError, submitVideo } from '../application/usecases/submitVideo.usecase'
import {
  putMediaObject,
  respondWithMediaObject,
} from '../infrastructure/external-services/videoStorage'
import {
  findStoredVideo,
  findThread,
  saveThreadNotice,
  saveVideo,
} from '../infrastructure/repositories/threadRepository'

const SUBMIT_ERROR = {
  not_found: { status: 404, message: 'スレッドが見つかりません' },
  closed: { status: 409, message: 'このスレッドは終了しています' },
  expired: { status: 409, message: 'このスレッドは期限が切れています' },
  awaiting_reply: { status: 409, message: 'コーチの返信が届いてから、次の動画を送れます' },
  video_limit: { status: 409, message: 'このスレッドで送れる動画の本数に達しています' },
  unsupported_type: { status: 415, message: '動画のファイル（mp4・mov・webm）を選んでください' },
  too_large: { status: 413, message: '動画は100MBまでです。短く切ってから送ってください' },
  theme_required: { status: 400, message: '直したいところを書いてください' },
  note_too_long: { status: 400, message: 'メモは1000文字までです' },
} as const satisfies Record<SubmitVideoError, { status: number; message: string }>

/** 数でなければ null。範囲の確認はユースケースで行う */
const parseFrameRate = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const decodeHeader = (request: Request, name: string): string => {
  const value = request.headers.get(name)
  if (value === null) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

/**
 * 生徒の動画を受け取って R2 に保存する
 *
 * 本体は multipart にせずそのまま送ってもらい、R2 へ流す（Worker のメモリに載せない）。
 * テーマとメモは URL エンコードしてヘッダーで受ける
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

  const result = await submitVideo(
    {
      actor,
      threadId,
      theme: decodeHeader(request, 'x-thread-theme'),
      note: decodeHeader(request, 'x-video-note'),
      contentType: (request.headers.get('content-type') ?? '').split(';')[0]?.trim() ?? '',
      sizeBytes,
      frameRate: parseFrameRate(request.headers.get('x-video-frame-rate')),
      now: new Date(),
    },
    {
      findThread,
      findCoachAvailabilityFacts,
      saveThreadNotice,
      storeVideo: (r2Key, contentType) => putMediaObject(r2Key, body, contentType),
      saveVideo,
      notifyVideoSubmitted: (input) => notify({ kind: 'video_submitted', ...input }),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    const { status, message } = SUBMIT_ERROR[result.error]
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
