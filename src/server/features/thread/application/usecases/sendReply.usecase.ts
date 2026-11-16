import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import {
  checkReplySubmission,
  type ReplyBlocker,
  requestedDrillIds,
} from '../../domain/services/checkReplySubmission.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import type { ReviewCard } from '../../domain/values/ReviewCard'
import type { Thread } from '../../domain/values/Thread'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewReply = Readonly<{
  id: string
  submissionId: string
  threadId: string
  sentAt: Date
  nextStatus: ThreadStatus
  cards: ReadonlyArray<
    ReviewCard & { id: string; videoId: string; sortOrder: number; imageR2Key: string }
  >
}>

export type SendReplyParams = Readonly<{
  actor: Actor
  threadId: string
  submissionId: string
  /** videoId：カードを作った動画（その提出の正面・後方など） */
  cards: ReadonlyArray<ReviewCard & { imageBytes: number; videoId: string }>
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  /** 自分のドリルか。他のコーチのドリルは付けられない */
  findOwnDrillIds: (coachUserId: string, drillIds: string[]) => Promise<string[]>
  /** index 番目のカード画像を保存する */
  storeCardImage: (r2Key: string, index: number) => Promise<void>
  saveReply: (reply: NewReply) => Promise<void>
  /** 生徒に「添削が届きました」と知らせる（キューに積むだけ） */
  notifyReplySent: (input: { threadId: string; studentUserId: string }) => Promise<void>
  generateId: () => string
}>

export type SendReplyError = 'not_found' | ReplyBlocker

export type SendReply = (
  params: SendReplyParams,
  dependencies: Dependencies
) => Promise<Result<{ replyId: string }, SendReplyError>>

/**
 * コーチが提出に添削カードを返す（提出の動画すべてについて、カードをまとめて1通で送る。
 * 返せるかは checkReplySubmission で決める）
 */
export const sendReply: SendReply = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  const submission = thread?.submissions.find((s) => s.id === params.submissionId)
  if (!thread || !submission || thread.coachUserId !== params.actor.userId) {
    return err('not_found')
  }
  const drillIds = requestedDrillIds(params.cards)
  const ownDrillIds =
    drillIds.length > 0 ? await deps.findOwnDrillIds(thread.coachUserId, drillIds) : []
  const blocker = checkReplySubmission({
    thread,
    submission,
    cards: params.cards,
    ownDrillIds,
  })
  if (blocker) {
    return err(blocker)
  }

  const replyId = deps.generateId()
  const cards = await Promise.all(
    params.cards.map(async (card, index) => {
      const id = deps.generateId()
      const imageR2Key = `cards/${thread.id}/${id}.png`
      await deps.storeCardImage(imageR2Key, index)
      return {
        id,
        videoId: card.videoId,
        sortOrder: index,
        imageR2Key,
        position: card.position,
        timeSec: card.timeSec,
        annotations: card.annotations,
        comment: card.comment,
        drillId: card.drillId,
      }
    })
  )
  await deps.saveReply({
    id: replyId,
    submissionId: submission.id,
    threadId: thread.id,
    sentAt: params.now,
    nextStatus: nextStatusAfter(thread, 'coach_replied'),
    cards,
  })
  await deps.notifyReplySent({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ replyId })
}
