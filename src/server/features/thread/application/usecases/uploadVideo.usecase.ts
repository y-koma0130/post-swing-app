import type { CoachAbsence } from '@/server/features/coach/domain/values/CoachAbsence'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { withEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import {
  checkSubmission,
  type SubmissionBlocker,
} from '../../domain/services/checkSubmission.service'
import {
  checkVideoUpload,
  type VideoUploadBlocker,
} from '../../domain/services/checkVideoUpload.service'
import type { Thread } from '../../domain/values/Thread'
import type { VideoAngle } from '../../domain/values/VideoAngle'

/** 提出前の動画（下書き）。提出したときに submission にひも付く */
export type NewDraftVideo = Readonly<{
  id: string
  threadId: string
  uploaderUserId: string
  angle: VideoAngle
  r2Key: string
  contentType: string
  sizeBytes: number
  durationSec: number | null
  frameRate: number | null
  uploadedAt: Date
}>

export type UploadVideoParams = Readonly<{
  actor: Actor
  threadId: string
  contentType: string
  sizeBytes: number
  /** 正面・後方・その他 */
  angle: string
  /** 生徒のブラウザが測った長さ（秒）。測れなければ null */
  durationSec: number | null
  /** 生徒のブラウザが測ったフレームレート（コマ送りに使う）。信用できない値は記録しない */
  frameRate: number | null
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** コーチの不在期間（期限が延びるので、提出できるかの判定に使う。coach が持つ） */
  findCoachAvailabilityFacts: (
    coachUserId: string
  ) => Promise<{ absences: CoachAbsence[]; delayFlagSetAt: Date | null }>
  /** 動画の本体を保存する（R2）。権限と形式を確かめたあとにだけ呼ぶ */
  storeVideo: (r2Key: string, contentType: string) => Promise<void>
  saveDraftVideo: (video: NewDraftVideo) => Promise<void>
  generateId: () => string
}>

export type UploadVideoError = 'not_found' | SubmissionBlocker | VideoUploadBlocker

export type UploadVideo = (
  params: UploadVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, UploadVideoError>>

/**
 * 生徒が提出に使う動画を1本上げる（下書き。コーチにはまだ見えず、スレッドの状態も変えない）。
 * 1回の提出の動画（正面・後方など）を1本ずつ上げ、submitSubmission でまとめて確定する
 */
export const uploadVideo: UploadVideo = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) {
    return err('not_found')
  }
  // 提出できない状態なら、大きな動画を受け取る前に止める（期限はコーチの不在の分だけ延びる）
  const { absences } = await deps.findCoachAvailabilityFacts(thread.coachUserId)
  const blocker = checkSubmission(withEffectiveExpiry(thread, absences), params.now)
  if (blocker) {
    return err(blocker)
  }
  const upload = checkVideoUpload(params)
  if (!upload.ok) {
    return err(upload.error)
  }

  const videoId = deps.generateId()
  const r2Key = `videos/${thread.id}/${videoId}`
  await deps.storeVideo(r2Key, params.contentType)
  await deps.saveDraftVideo({
    id: videoId,
    threadId: thread.id,
    uploaderUserId: params.actor.userId,
    r2Key,
    contentType: params.contentType,
    sizeBytes: params.sizeBytes,
    ...upload.value,
    uploadedAt: params.now,
  })
  return ok({ videoId })
}
