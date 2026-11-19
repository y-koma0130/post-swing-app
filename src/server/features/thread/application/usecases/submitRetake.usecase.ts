import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  acceptDraftVideos,
  type DraftVideosBlocker,
} from '../../domain/services/checkSubmissionContents.service'
import { findRespondableRetake } from '../../domain/services/findRespondableRetake.service'
import type { RetakeRequest } from '../../domain/values/RetakeRequest'
import type { DraftVideo } from '../../domain/values/Submission'
import type { Thread } from '../../domain/values/Thread'

export type RetakeVideos = Readonly<{
  requestId: string
  submissionId: string
  videoIds: ReadonlyArray<string>
  sentAt: Date
}>

export type SubmitRetakeParams = Readonly<{
  actor: Actor
  threadId: string
  requestId: string
  videoIds: ReadonlyArray<string>
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  findRetakeRequests: (threadId: string) => Promise<RetakeRequest[]>
  findDraftVideos: (videoIds: ReadonlyArray<string>) => Promise<DraftVideo[]>
  /** 動画を元の提出にひも付け、お願いを「届いた」で終える */
  saveRetakeVideos: (retake: RetakeVideos) => Promise<void>
  /** コーチに「撮り直しが届いた」と知らせる */
  notifyRetakeSent: (input: { threadId: string; coachUserId: string }) => Promise<void>
}>

export type SubmitRetakeError = 'not_found' | 'no_retake' | DraftVideosBlocker

export type SubmitRetake = (
  params: SubmitRetakeParams,
  dependencies: Dependencies
) => Promise<Result<void, SubmitRetakeError>>

/**
 * 生徒が撮り直しの動画を送る（提出回数には数えず、元の提出に動画を足す）。
 * 本人の生徒だけで、開いているお願いにだけ。動画のルールは提出と同じ（acceptDraftVideos）
 */
export const submitRetake: SubmitRetake = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  if (!thread || thread.studentUserId !== params.actor.userId) {
    return err('not_found')
  }
  const request = findRespondableRetake({
    threadStatus: thread.status,
    requests: await deps.findRetakeRequests(thread.id),
    requestId: params.requestId,
  })
  if (!request) {
    return err('no_retake')
  }
  const videos = acceptDraftVideos({
    thread,
    actorUserId: params.actor.userId,
    videoIds: params.videoIds,
    drafts: await deps.findDraftVideos(params.videoIds),
  })
  if (!videos.ok) return err(videos.error)
  await deps.saveRetakeVideos({
    requestId: request.id,
    submissionId: request.submissionId,
    videoIds: videos.value.map((v) => v.id),
    sentAt: params.now,
  })
  await deps.notifyRetakeSent({ threadId: thread.id, coachUserId: thread.coachUserId })
  return ok(undefined)
}
