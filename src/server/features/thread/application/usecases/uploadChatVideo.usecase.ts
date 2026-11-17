import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkVideoUpload,
  type VideoUploadBlocker,
} from '../../domain/services/checkVideoUpload.service'
import type { Thread } from '../../domain/values/Thread'
import { isFinished, isInLesson } from '../../domain/values/ThreadStatus'
import type { NewDraftVideo } from './uploadVideo.usecase'

export type UploadChatVideoParams = Readonly<{
  actor: Actor
  threadId: string
  contentType: string
  sizeBytes: number
  durationSec: number | null
  frameRate: number | null
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  storeVideo: (r2Key: string, contentType: string) => Promise<void>
  saveDraftVideo: (video: NewDraftVideo) => Promise<void>
  generateId: () => string
}>

export type UploadChatVideoError = 'not_found' | 'closed' | 'not_started' | VideoUploadBlocker

export type UploadChatVideo = (
  params: UploadChatVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, UploadChatVideoError>>

/**
 * コーチがチャットに添える動画（お手本など）を上げる（下書き。sendChatMessage で送ったときにひも付く）。
 * 担当のコーチだけ。形式・大きさ・長さは生徒の動画と同じルール（checkVideoUpload）。角度は選ばない
 */
export const uploadChatVideo: UploadChatVideo = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.coachUserId !== params.actor.userId) {
    return err('not_found')
  }
  if (isFinished(thread.status)) {
    return err('closed')
  }
  if (!isInLesson(thread.status)) {
    return err('not_started')
  }
  const upload = checkVideoUpload({ ...params, angle: 'other' })
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
