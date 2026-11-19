import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'

export type StoredDrillVideo = Readonly<{
  r2Key: string
  contentType: string
  coachUserId: string
}>

type Dependencies = Readonly<{
  findDrillVideo: (videoId: string) => Promise<StoredDrillVideo | null>
  /** 添削かチャットで、この動画のドリルを受け取った生徒か */
  hasReceivedDrillVideo: (videoId: string, studentUserId: string) => Promise<boolean>
}>

export type AuthorizeDrillVideo = (
  params: Readonly<{ actor: Actor; videoId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ r2Key: string; contentType: string }, 'not_found'>>

/**
 * ドリルの動画を見てよいか
 *
 * ドメインルール:
 * - 上げたコーチ本人と、そのドリルを添削かチャットで受け取った生徒だけ
 * - コーチがドリルを消しても、受け取った生徒は見られる
 */
export const authorizeDrillVideo: AuthorizeDrillVideo = async ({ actor, videoId }, deps) => {
  const video = await deps.findDrillVideo(videoId)
  if (!video) return err('not_found')
  const allowed =
    video.coachUserId === actor.userId || (await deps.hasReceivedDrillVideo(videoId, actor.userId))
  return allowed ? ok({ r2Key: video.r2Key, contentType: video.contentType }) : err('not_found')
}
