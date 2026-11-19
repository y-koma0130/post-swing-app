import 'server-only'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  absenceAck,
  coachProfile,
  coachReview,
  reply,
  replyDrill,
  reviewCard,
  thread,
  threadNotice,
  threadRead,
  user,
  video,
} from '@/server/db/schema'
import { calcCoachAvailability } from '@/server/features/coach/domain/services/calcCoachAvailability.service'
import {
  findCoachAvailabilityFacts,
  toAvailabilityDto,
  toAvatarUrl,
} from '@/server/features/coach/public'
import type { ThreadDetailDto, ThreadMembers } from '../../application/dto/ThreadDetail.dto'
import { THREAD_RULES, VIDEO_RULES } from '../../domain/rules'
import { calcApprovalDeadline } from '../../domain/services/calcApprovalDeadline.service'
import { calcEffectiveExpiry } from '../../domain/services/calcEffectiveExpiry.service'
import { studentChatBlocker } from '../../domain/services/checkChatMessage.service'
import { checkStudentClose } from '../../domain/services/checkStudentClose.service'
import { checkSubmission } from '../../domain/services/checkSubmission.service'
import { countRemainingStudentMessages } from '../../domain/services/countRemainingStudentMessages.service'
import { decideSendGuard } from '../../domain/services/decideSendGuard.service'
import { annotationSchema } from '../../domain/values/Annotation'
import { findThread } from '../repositories/threadRepository'

/** ドリルのお手本の動画の URL（見てよいかは drill の Route Handler が確かめる） */
const drillVideoUrl = (videoId: string | null): string | null =>
  videoId === null ? null : `/api/drill-videos/${videoId}`

export type FindThreadDetail = (
  threadId: string
) => Promise<{ detail: ThreadDetailDto; members: ThreadMembers } | null>

/** スレッドの詳細（提出・添削カード・チャット・お知らせ）。権限の確認はユースケースで行う */
export const findThreadDetail: FindThreadDetail = async (threadId) => {
  const t = await findThread(threadId)
  if (!t) {
    return null
  }
  const db = getDb()
  const submissionIds = t.submissions.map((s) => s.id)
  const videoIds = [
    ...t.submissions.flatMap((s) => s.videos.map((v) => v.id)),
    ...t.messages.flatMap((m) => (m.attachment.kind === 'video' ? [m.attachment.videoId] : [])),
  ]
  const reviewRow = await db
    .select({
      rating: coachReview.rating,
      comment: coachReview.comment,
      coachReply: coachReview.coachReply,
    })
    .from(coachReview)
    .where(eq(coachReview.threadId, threadId))
    .get()
  const [people, replies, cards, frameRates, replyDrills] = await Promise.all([
    db
      .select({
        coachName: coachProfile.displayName,
        coachAvatarKey: coachProfile.avatarR2Key,
        coachSlug: coachProfile.slug,
        studentName: user.name,
        declineReason: thread.declineReason,
        declineMessage: thread.declineMessage,
      })
      .from(thread)
      .innerJoin(coachProfile, eq(coachProfile.userId, thread.coachUserId))
      .innerJoin(user, eq(user.id, thread.studentUserId))
      .where(eq(thread.id, threadId))
      .get(),
    submissionIds.length === 0
      ? []
      : db.select().from(reply).where(inArray(reply.submissionId, submissionIds)).all(),
    submissionIds.length === 0
      ? []
      : db
          .select({ card: reviewCard, submissionId: reply.submissionId })
          .from(reviewCard)
          .innerJoin(reply, eq(reply.id, reviewCard.replyId))
          .where(inArray(reply.submissionId, submissionIds))
          .orderBy(asc(reviewCard.sortOrder))
          .all(),
    videoIds.length === 0
      ? []
      : db
          .select({ id: video.id, frameRate: video.frameRate })
          .from(video)
          .where(inArray(video.id, videoIds))
          .all(),
    submissionIds.length === 0
      ? []
      : db
          .select({
            replyId: replyDrill.replyId,
            title: replyDrill.title,
            description: replyDrill.description,
            videoId: replyDrill.videoId,
          })
          .from(replyDrill)
          .innerJoin(reply, eq(reply.id, replyDrill.replyId))
          .where(inArray(reply.submissionId, submissionIds))
          .orderBy(asc(replyDrill.sortOrder))
          .all(),
  ])
  if (!people) {
    return null
  }
  const [facts, notices, acks, reads] = await Promise.all([
    findCoachAvailabilityFacts(t.coachUserId),
    db
      .select()
      .from(threadNotice)
      .where(eq(threadNotice.threadId, threadId))
      .orderBy(asc(threadNotice.createdAt))
      .all(),
    db
      .select({ absenceId: absenceAck.absenceId })
      .from(absenceAck)
      .where(and(eq(absenceAck.threadId, threadId), eq(absenceAck.studentUserId, t.studentUserId)))
      .all(),
    db
      .select({ userId: threadRead.userId, lastReadAt: threadRead.lastReadAt })
      .from(threadRead)
      .where(eq(threadRead.threadId, threadId))
      .all(),
  ])
  const readAtOf = (userId: string) => reads.find((r) => r.userId === userId)?.lastReadAt ?? null
  const now = new Date()
  const availability = calcCoachAvailability({ ...facts, now })
  const expiry = calcEffectiveExpiry(t, facts.absences)
  const chatAcknowledged =
    availability.kind === 'absent' && acks.some((a) => a.absenceId === availability.absence.id)

  const detail: ThreadDetailDto = {
    id: t.id,
    coachName: people.coachName,
    coachSlug: people.coachSlug,
    coachAvatarUrl: toAvatarUrl(people.coachSlug, people.coachAvatarKey),
    studentName: people.studentName,
    planKind: t.planKind,
    theme: t.theme,
    status: t.status,
    startedAt: t.startedAt,
    expiresAt: expiry.expiresAt,
    extendedDays: expiry.extendedDays,
    application: {
      approvalDeadline:
        t.status === 'requested' && t.requestedAt ? calcApprovalDeadline(t.requestedAt) : null,
      decline:
        t.status === 'declined' && people.declineReason
          ? { reason: people.declineReason, message: people.declineMessage ?? '' }
          : null,
    },
    coachAvailability: toAvailabilityDto(availability),
    sendGuard: {
      video: decideSendGuard({ availability, target: 'video', acknowledged: false }),
      chat: decideSendGuard({ availability, target: 'chat', acknowledged: chatAcknowledged }),
    },
    limits: {
      maxSubmissions: THREAD_RULES.maxSubmissionsByPlan[t.planKind],
      maxVideosPerSubmission: THREAD_RULES.maxVideosPerSubmission,
      maxVideoBytes: VIDEO_RULES.maxBytes,
      maxVideoSeconds: VIDEO_RULES.maxDurationSeconds,
      maxStudentMessages: THREAD_RULES.maxStudentMessagesByPlan[t.planKind],
    },
    submissionBlocker: checkSubmission({ ...t, expiresAt: expiry.expiresAt }, now),
    studentCloseBlocker: checkStudentClose(t),
    remainingStudentMessages: countRemainingStudentMessages(t),
    studentChatBlocker: studentChatBlocker(t),
    lastReadAt: { coach: readAtOf(t.coachUserId), student: readAtOf(t.studentUserId) },
    review: reviewRow ?? null,
    submissions: t.submissions.map((s) => {
      const r = replies.find((x) => x.submissionId === s.id)
      return {
        id: s.id,
        submittedAt: s.submittedAt,
        note: s.note,
        videos: s.videos.map((v) => ({
          id: v.id,
          angle: v.angle,
          url: `/api/videos/${v.id}`,
          frameRate: frameRates.find((x) => x.id === v.id)?.frameRate ?? null,
        })),
        reply: r
          ? {
              sentAt: r.sentAt,
              comment: r.comment,
              drills: replyDrills
                .filter((d) => d.replyId === r.id)
                .map(({ title, description, videoId }) => ({
                  title,
                  description,
                  videoUrl: drillVideoUrl(videoId),
                })),
              cards: cards
                .filter((c) => c.submissionId === s.id)
                .map(({ card }) => ({
                  id: card.id,
                  videoId: card.videoId,
                  position: card.position,
                  timeSec: card.timeSec,
                  annotations: annotationSchema.array().parse(card.annotations),
                  comment: card.comment,
                  imageUrl: `/api/cards/${card.id}/image`,
                })),
            }
          : null,
      }
    }),
    messages: t.messages.map(({ attachment, ...m }) => ({
      ...m,
      attachment:
        attachment.kind === 'video'
          ? {
              ...attachment,
              url: `/api/videos/${attachment.videoId}`,
              frameRate: frameRates.find((x) => x.id === attachment.videoId)?.frameRate ?? null,
            }
          : attachment.kind === 'drill'
            ? {
                kind: 'drill',
                title: attachment.title,
                description: attachment.description,
                videoUrl: drillVideoUrl(attachment.videoId),
              }
            : attachment,
    })),
    notices: notices.map((n) => ({
      id: n.id,
      absenceEndDate: n.absenceEndDate,
      createdAt: n.createdAt,
    })),
  }
  return { detail, members: { coachUserId: t.coachUserId, studentUserId: t.studentUserId } }
}
