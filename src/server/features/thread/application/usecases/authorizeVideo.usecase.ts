import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import type { ThreadMembers } from '../dto/ThreadDetail.dto'

export type StoredVideo = Readonly<{
  r2Key: string
  contentType: string
  deleted: boolean
  members: ThreadMembers
}>

type Dependencies = Readonly<{
  findStoredVideo: (videoId: string) => Promise<StoredVideo | null>
}>

export type AuthorizeVideo = (
  params: Readonly<{ actor: Actor; videoId: string }>,
  dependencies: Dependencies
) => Promise<Result<{ r2Key: string; contentType: string }, 'not_found'>>

/** 動画を見てよいか。担当のコーチと本人の生徒だけ */
export const authorizeVideo: AuthorizeVideo = async ({ actor, videoId }, deps) => {
  const video = await deps.findStoredVideo(videoId)
  if (
    !video ||
    video.deleted ||
    (video.members.coachUserId !== actor.userId && video.members.studentUserId !== actor.userId)
  ) {
    return err('not_found')
  }
  return ok({ r2Key: video.r2Key, contentType: video.contentType })
}
