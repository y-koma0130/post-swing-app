import 'server-only'
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { retakeRequest, video } from '@/server/db/schema'
import type { NewRetakeRequest } from '../../application/usecases/requestRetake.usecase'
import type { RetakeVideos } from '../../application/usecases/submitRetake.usecase'
import { type RetakeRequest, retakeRequestSchema } from '../../domain/values/RetakeRequest'

/** スレッドの撮り直しのお願い（古い順） */
export type FindRetakeRequests = (threadId: string) => Promise<RetakeRequest[]>
export const findRetakeRequests: FindRetakeRequests = async (threadId) => {
  const rows = await getDb()
    .select()
    .from(retakeRequest)
    .where(eq(retakeRequest.threadId, threadId))
    .orderBy(asc(retakeRequest.requestedAt))
    .all()
  return rows.map((row) => retakeRequestSchema.parse(row))
}

export type SaveRetakeRequest = (request: NewRetakeRequest) => Promise<void>
export const saveRetakeRequest: SaveRetakeRequest = async (request) => {
  await getDb()
    .insert(retakeRequest)
    .values({ ...request, closedAt: null, closeReason: null })
}

export type SaveRetakeVideos = (retake: RetakeVideos) => Promise<void>
/** 撮り直しの動画を元の提出にひも付け、お願いを「届いた」で終える（まとめて書く） */
export const saveRetakeVideos: SaveRetakeVideos = async (retake) => {
  const db = getDb()
  await db.batch([
    db
      .update(video)
      .set({ submissionId: retake.submissionId, retakeRequestId: retake.requestId })
      .where(
        and(
          inArray(video.id, [...retake.videoIds]),
          isNull(video.submissionId),
          isNull(video.chatMessageId)
        )
      ),
    db
      .update(retakeRequest)
      .set({ closedAt: retake.sentAt, closeReason: 'resent' })
      .where(and(eq(retakeRequest.id, retake.requestId), isNull(retakeRequest.closedAt))),
  ])
}

export type CloseRetakeRequest = (input: { requestId: string; closedAt: Date }) => Promise<void>
/** お願いを「生徒が今は撮れない」で終える */
export const closeRetakeRequest: CloseRetakeRequest = async ({ requestId, closedAt }) => {
  await getDb()
    .update(retakeRequest)
    .set({ closedAt, closeReason: 'declined' })
    .where(and(eq(retakeRequest.id, requestId), isNull(retakeRequest.closedAt)))
}
