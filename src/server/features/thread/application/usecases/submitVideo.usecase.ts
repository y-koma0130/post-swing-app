import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkVideoSubmission,
  type VideoSubmissionBlocker,
} from '../../domain/services/checkVideoSubmission.service'
import {
  checkVideoUpload,
  type VideoUploadBlocker,
} from '../../domain/services/checkVideoUpload.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import type { Thread } from '../../domain/values/Thread'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewVideo = Readonly<{
  id: string
  threadId: string
  r2Key: string
  contentType: string
  sizeBytes: number
  note: string
  frameRate: number | null
  uploadedAt: Date
  nextStatus: ThreadStatus
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

export type SubmitVideoError = 'not_found' | VideoSubmissionBlocker | VideoUploadBlocker

export type SubmitVideo = (
  params: SubmitVideoParams,
  dependencies: Dependencies
) => Promise<Result<{ videoId: string }, SubmitVideoError>>

/**
 * 生徒が動画を送る（送れるかは checkVideoSubmission・checkVideoUpload で決める）
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
  const upload = checkVideoUpload({
    thread,
    contentType: params.contentType,
    sizeBytes: params.sizeBytes,
    note: params.note,
    theme: params.theme,
    frameRate: params.frameRate,
  })
  if (!upload.ok) {
    return err(upload.error)
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
    ...upload.value,
    uploadedAt: params.now,
    nextStatus: nextStatusAfter(thread, 'student_sent_video'),
  })
  await deps.notifyVideoSubmitted({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok({ videoId })
}
