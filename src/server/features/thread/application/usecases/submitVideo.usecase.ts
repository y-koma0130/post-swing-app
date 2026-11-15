import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { VIDEO_RULES } from '../../domain/rules'
import {
  checkVideoSubmission,
  type VideoSubmissionBlocker,
} from '../../domain/services/checkVideoSubmission.service'
import { type Thread, threadThemeSchema } from '../../domain/values/Thread'

export type NewVideo = Readonly<{
  id: string
  threadId: string
  r2Key: string
  contentType: string
  sizeBytes: number
  note: string
  frameRate: number | null
  uploadedAt: Date
  /** 最初の動画のときだけ、スレッドのテーマも保存する */
  theme: string | null
}>

export type SubmitVideoParams = Readonly<{
  actor: Actor
  threadId: string
  theme: string
  note: string
  contentType: string
  sizeBytes: number
  /** 生徒のブラウザが測ったフレームレート（コマ送りに使う）。信用できない値は記録しない */
  frameRate: number | null
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** 動画の本体を保存する（R2）。権限と形式を確かめたあとにだけ呼ぶ */
  storeVideo: (r2Key: string, contentType: string) => Promise<void>
  /** 動画の記録を残し、スレッドをコーチの番にする */
  saveVideo: (video: NewVideo) => Promise<void>
  /** コーチに「動画が届きました」と知らせる（キューに積むだけ） */
  notifyVideoSubmitted: (input: { threadId: string; coachUserId: string }) => Promise<void>
  generateId: () => string
}>

export type SubmitVideoError =
  | 'not_found'
  | VideoSubmissionBlocker
  | 'unsupported_type'
  | 'too_large'
  | 'theme_required'
  | 'note_too_long'

export type SubmitVideo = (
  params: SubmitVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, SubmitVideoError>>

const isAllowedContentType = (contentType: string): boolean =>
  VIDEO_RULES.allowedContentTypes.some((allowed) => allowed === contentType)

/** 範囲外・数でない値は null にする（送信は止めない。再生画面が推定で補う） */
const acceptFrameRate = (frameRate: number | null): number | null =>
  frameRate !== null &&
  Number.isFinite(frameRate) &&
  frameRate >= VIDEO_RULES.minFrameRate &&
  frameRate <= VIDEO_RULES.maxFrameRate
    ? frameRate
    : null

/**
 * 生徒が動画を送る
 *
 * ドメインルール:
 * - 本人のスレッドにだけ送れる
 * - 動画の形式は mp4・mov・webm、大きさは100MBまで
 * - 最初の動画ではテーマ（直したいところ）を書く
 */
export const submitVideo: SubmitVideo = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) {
    return err('not_found')
  }
  const blocker = checkVideoSubmission(thread, params.now)
  if (blocker) {
    return err(blocker)
  }
  if (!isAllowedContentType(params.contentType)) {
    return err('unsupported_type')
  }
  if (params.sizeBytes <= 0 || params.sizeBytes > VIDEO_RULES.maxBytes) {
    return err('too_large')
  }
  if (params.note.length > 1000) {
    return err('note_too_long')
  }
  const isFirst = thread.videos.length === 0
  const theme = isFirst ? threadThemeSchema.safeParse(params.theme) : null
  if (theme && !theme.success) {
    return err('theme_required')
  }

  const videoId = deps.generateId()
  const r2Key = `videos/${thread.id}/${videoId}`
  await deps.storeVideo(r2Key, params.contentType)
  await deps.saveVideo({
    id: videoId,
    threadId: thread.id,
    r2Key,
    contentType: params.contentType,
    sizeBytes: params.sizeBytes,
    note: params.note.trim(),
    frameRate: acceptFrameRate(params.frameRate),
    uploadedAt: params.now,
    theme: theme?.success ? theme.data : null,
  })
  await deps.notifyVideoSubmitted({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok({ videoId })
}
