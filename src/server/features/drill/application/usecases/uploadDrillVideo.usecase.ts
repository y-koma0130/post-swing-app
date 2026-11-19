import {
  checkVideoUpload,
  type VideoUploadBlocker,
} from '@/server/features/thread/domain/services/checkVideoUpload.service'
import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

export type UploadDrillVideoParams = Readonly<{
  actor: Actor
  contentType: string
  sizeBytes: number
  durationSec: number | null
  frameRate: number | null
  now: Date
}>

export type NewDrillVideo = Readonly<{
  id: string
  coachUserId: string
  r2Key: string
  contentType: string
  sizeBytes: number
  durationSec: number | null
  frameRate: number | null
  uploadedAt: Date
}>

type Dependencies = Readonly<{
  isCoach: (userId: string) => Promise<boolean>
  storeVideo: (r2Key: string, contentType: string) => Promise<void>
  saveDrillVideo: (video: NewDrillVideo) => Promise<void>
  generateId: () => string
}>

export type UploadDrillVideoError = 'not_found' | Exclude<VideoUploadBlocker, 'invalid_angle'>

export type UploadDrillVideo = (
  params: UploadDrillVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, UploadDrillVideoError>>

/**
 * ドリルのお手本の動画を上げる（下書き。ドリルを登録したときにひも付く）。コーチだけ。
 * 形式・大きさ・長さは、生徒の動画と同じルール（checkVideoUpload）。角度は選ばない
 */
export const uploadDrillVideo: UploadDrillVideo = async (params, deps) => {
  if (!(await deps.isCoach(params.actor.userId))) {
    return err('not_found')
  }
  const upload = checkVideoUpload({ ...params, angle: 'other' })
  if (!upload.ok) {
    // 角度は 'other' を渡しているので invalid_angle にはならない
    return err(upload.error === 'invalid_angle' ? 'unsupported_type' : upload.error)
  }
  const videoId = deps.generateId()
  const r2Key = `drill-videos/${params.actor.userId}/${videoId}`
  await deps.storeVideo(r2Key, params.contentType)
  await deps.saveDrillVideo({
    id: videoId,
    coachUserId: params.actor.userId,
    r2Key,
    contentType: params.contentType,
    sizeBytes: params.sizeBytes,
    durationSec: upload.value.durationSec,
    frameRate: upload.value.frameRate,
    uploadedAt: params.now,
  })
  return ok({ videoId })
}
