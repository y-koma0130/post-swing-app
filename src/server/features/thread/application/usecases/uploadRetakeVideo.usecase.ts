import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkVideoUpload,
  type VideoUploadBlocker,
} from '../../domain/services/checkVideoUpload.service'
import { isOpenRetake, type RetakeRequest } from '../../domain/values/RetakeRequest'
import type { Thread } from '../../domain/values/Thread'
import type { NewDraftVideo } from './uploadVideo.usecase'

export type UploadRetakeVideoParams = Readonly<{
  actor: Actor
  threadId: string
  contentType: string
  sizeBytes: number
  angle: string
  durationSec: number | null
  frameRate: number | null
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findRetakeRequests: (threadId: string) => Promise<RetakeRequest[]>
  storeVideo: (r2Key: string, contentType: string) => Promise<void>
  saveDraftVideo: (video: NewDraftVideo) => Promise<void>
  generateId: () => string
}>

export type UploadRetakeVideoError = 'not_found' | 'no_retake' | VideoUploadBlocker

export type UploadRetakeVideo = (
  params: UploadRetakeVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, UploadRetakeVideoError>>

/**
 * 撮り直しの動画を上げる（下書き。submitRetake で元の提出にひも付く）。
 * 本人の生徒だけで、コーチの撮り直しのお願いが開いているときだけ。形式・大きさ・長さは提出と同じルール
 */
export const uploadRetakeVideo: UploadRetakeVideo = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) {
    return err('not_found')
  }
  const requests = await deps.findRetakeRequests(thread.id)
  if (thread.status !== 'waiting_coach' || !requests.some(isOpenRetake)) {
    return err('no_retake')
  }
  const upload = checkVideoUpload(params)
  if (!upload.ok) return err(upload.error)
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
