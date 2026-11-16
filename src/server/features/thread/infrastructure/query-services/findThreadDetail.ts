import 'server-only'
import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  coachProfile,
  coachReview,
  drill,
  reply,
  reviewCard,
  thread,
  user,
  video,
} from '@/server/db/schema'
import type { ThreadDetailDto, ThreadMembers } from '../../application/dto/ThreadDetail.dto'
import { THREAD_RULES, VIDEO_RULES } from '../../domain/rules'
import { checkVideoSubmission } from '../../domain/services/checkVideoSubmission.service'
import { countRemainingStudentMessages } from '../../domain/services/countRemainingStudentMessages.service'
import { annotationSchema } from '../../domain/values/Annotation'
import { findThread } from '../repositories/threadRepository'

export type FindThreadDetail = (
  threadId: string
) => Promise<{ detail: ThreadDetailDto; members: ThreadMembers } | null>

/** スレッドの詳細（動画・添削カード・チャット）。権限の確認はユースケースで行う */
export const findThreadDetail: FindThreadDetail = async (threadId) => {
  const t = await findThread(threadId)
  if (!t) {
    return null
  }
  const db = getDb()
  const videoIds = t.videos.map((v) => v.id)
  const reviewRow = await db
    .select({
      rating: coachReview.rating,
      comment: coachReview.comment,
      coachReply: coachReview.coachReply,
    })
    .from(coachReview)
    .where(eq(coachReview.threadId, threadId))
    .get()
  const [people, replies, cards, frameRates] = await Promise.all([
    db
      .select({
        coachName: coachProfile.displayName,
        coachSlug: coachProfile.slug,
        studentName: user.name,
      })
      .from(thread)
      .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
      .innerJoin(user, eq(user.id, thread.studentUserId))
      .where(eq(thread.id, threadId))
      .get(),
    videoIds.length === 0
      ? []
      : db.select().from(reply).where(inArray(reply.videoId, videoIds)).all(),
    videoIds.length === 0
      ? []
      : db
          .select({
            card: reviewCard,
            videoId: reply.videoId,
            drillTitle: drill.title,
            drillDescription: drill.description,
          })
          .from(reviewCard)
          .innerJoin(reply, eq(reply.id, reviewCard.replyId))
          .leftJoin(drill, eq(drill.id, reviewCard.drillId))
          .where(inArray(reply.videoId, videoIds))
          .orderBy(asc(reviewCard.sortOrder))
          .all(),
    videoIds.length === 0
      ? []
      : db
          .select({ id: video.id, frameRate: video.frameRate })
          .from(video)
          .where(inArray(video.id, videoIds))
          .all(),
  ])
  if (!people) {
    return null
  }

  const detail: ThreadDetailDto = {
    id: t.id,
    coachName: people.coachName,
    coachSlug: people.coachSlug,
    studentName: people.studentName,
    planKind: t.planKind,
    theme: t.theme,
    status: t.status,
    startedAt: t.startedAt,
    expiresAt: t.expiresAt,
    maxVideos: THREAD_RULES.maxVideosByPlan[t.planKind],
    maxVideoBytes: VIDEO_RULES.maxBytes,
    videoSubmissionBlocker: checkVideoSubmission(t, new Date()),
    review: reviewRow ?? null,
    videos: t.videos.map((v) => {
      const r = replies.find((x) => x.videoId === v.id)
      return {
        id: v.id,
        uploadedAt: v.uploadedAt,
        note: v.note,
        url: `/api/videos/${v.id}`,
        frameRate: frameRates.find((x) => x.id === v.id)?.frameRate ?? null,
        remainingStudentMessages: countRemainingStudentMessages(t, v.id),
        reply: r
          ? {
              sentAt: r.sentAt,
              cards: cards
                .filter((c) => c.videoId === v.id)
                .map(({ card, drillTitle, drillDescription }) => ({
                  id: card.id,
                  position: card.position,
                  timeSec: card.timeSec,
                  annotations: annotationSchema.array().parse(card.annotations),
                  comment: card.comment,
                  imageUrl: `/api/cards/${card.id}/image`,
                  drill:
                    drillTitle === null
                      ? null
                      : { title: drillTitle, description: drillDescription ?? '' },
                })),
            }
          : null,
        messages: t.messages
          .filter((m) => m.videoId === v.id)
          .map((m) => ({ id: m.id, from: m.from, body: m.body, sentAt: m.sentAt })),
      }
    }),
  }
  return { detail, members: { coachUserId: t.coachUserId, studentUserId: t.studentUserId } }
}
