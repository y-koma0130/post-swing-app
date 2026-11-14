import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { REPLY_RULES } from '../../domain/rules'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import type { ReviewCard } from '../../domain/values/ReviewCard'
import type { Thread } from '../../domain/values/Thread'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewReply = Readonly<{
  id: string
  videoId: string
  threadId: string
  sentAt: Date
  nextStatus: ThreadStatus
  cards: ReadonlyArray<ReviewCard & { id: string; sortOrder: number; imageR2Key: string }>
}>

export type SendReplyParams = Readonly<{
  actor: Actor
  threadId: string
  videoId: string
  cards: ReadonlyArray<ReviewCard & { imageBytes: number }>
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

export type SendReplyError =
  | 'not_found'
  | 'closed'
  | 'already_replied'
  | 'no_cards'
  | 'too_many_cards'
  | 'image_too_large'
  | 'invalid_drill'

export type SendReply = (
  params: SendReplyParams,
  dependencies: Dependencies
) => Promise<Result<{ replyId: string }, SendReplyError>>

/**
 * コーチが動画に添削カードを返す（カードをまとめて1通で送る）
 *
 * ドメインルール:
 * - 担当のコーチだけ。動画1本に返信は1通（追加の説明はチャットで）
 * - カードは1〜8枚
 * - 期限が過ぎても、期限内に届いた動画には返信できる（終了したスレッドは不可）
 */
export const sendReply: SendReply = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  const video = thread?.videos.find((v) => v.id === params.videoId)
  if (!thread || !video || thread.coachUserId !== params.actor.userId) {
    return err('not_found')
  }
  if (thread.status === 'closed') return err('closed')
  if (video.replied) return err('already_replied')
  if (params.cards.length === 0) return err('no_cards')
  if (params.cards.length > REPLY_RULES.maxCards) return err('too_many_cards')
  if (params.cards.some((c) => c.imageBytes <= 0 || c.imageBytes > REPLY_RULES.maxImageBytes)) {
    return err('image_too_large')
  }
  const drillIds = [...new Set(params.cards.flatMap((c) => (c.drillId ? [c.drillId] : [])))]
  if (drillIds.length > 0) {
    const own = await deps.findOwnDrillIds(thread.coachUserId, drillIds)
    if (own.length !== drillIds.length) return err('invalid_drill')
  }

  const replyId = deps.generateId()
  const cards = await Promise.all(
    params.cards.map(async (card, index) => {
      const id = deps.generateId()
      const imageR2Key = `cards/${thread.id}/${id}.png`
      await deps.storeCardImage(imageR2Key, index)
      return {
        id,
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
    videoId: video.id,
    threadId: thread.id,
    sentAt: params.now,
    nextStatus: nextStatusAfter(thread, 'coach_replied'),
    cards,
  })
  await deps.notifyReplySent({ threadId: thread.id, studentUserId: thread.studentUserId })
  return ok({ replyId })
}
