import 'server-only'
import { and, eq, lt, notExists } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  chatMessage,
  drill,
  drillVideo,
  reply,
  replyDrill,
  submission,
  thread,
} from '@/server/db/schema'
import type { StoredDrillVideo } from '../../application/usecases/authorizeDrillVideo.usecase'

/**
 * ドリルの動画を見せてよいかを決めるための読み取り。
 * 受け取ったかどうかは、送った添削（reply_drill）とチャット（chat_message）の写しを見る（thread の表は読むだけ）
 */

export type FindDrillVideo = (videoId: string) => Promise<StoredDrillVideo | null>
export const findDrillVideo: FindDrillVideo = async (videoId) =>
  (await getDb()
    .select({
      r2Key: drillVideo.r2Key,
      contentType: drillVideo.contentType,
      coachUserId: drillVideo.coachUserId,
    })
    .from(drillVideo)
    .where(eq(drillVideo.id, videoId))
    .get()) ?? null

export type HasReceivedDrillVideo = (videoId: string, studentUserId: string) => Promise<boolean>
export const hasReceivedDrillVideo: HasReceivedDrillVideo = async (videoId, studentUserId) => {
  const db = getDb()
  const [byReply, byChat] = await Promise.all([
    db
      .select({ replyId: replyDrill.replyId })
      .from(replyDrill)
      .innerJoin(reply, eq(reply.id, replyDrill.replyId))
      .innerJoin(submission, eq(submission.id, reply.submissionId))
      .innerJoin(thread, eq(thread.id, submission.threadId))
      .where(and(eq(replyDrill.videoId, videoId), eq(thread.studentUserId, studentUserId)))
      .get(),
    db
      .select({ id: chatMessage.id })
      .from(chatMessage)
      .innerJoin(thread, eq(thread.id, chatMessage.threadId))
      .where(and(eq(chatMessage.drillVideoId, videoId), eq(thread.studentUserId, studentUserId)))
      .get(),
  ])
  return byReply !== undefined || byChat !== undefined
}

export type FindOrphanDrillVideos = (
  uploadedBefore: Date
) => Promise<Array<{ id: string; r2Key: string }>>
/** ドリルにも、送った添削・チャットの写しにも使われていない動画 */
export const findOrphanDrillVideos: FindOrphanDrillVideos = async (uploadedBefore) => {
  const db = getDb()
  return db
    .select({ id: drillVideo.id, r2Key: drillVideo.r2Key })
    .from(drillVideo)
    .where(
      and(
        lt(drillVideo.uploadedAt, uploadedBefore),
        notExists(db.select({ id: drill.id }).from(drill).where(eq(drill.videoId, drillVideo.id))),
        notExists(
          db
            .select({ id: replyDrill.replyId })
            .from(replyDrill)
            .where(eq(replyDrill.videoId, drillVideo.id))
        ),
        notExists(
          db
            .select({ id: chatMessage.id })
            .from(chatMessage)
            .where(eq(chatMessage.drillVideoId, drillVideo.id))
        )
      )
    )
    .all()
}
