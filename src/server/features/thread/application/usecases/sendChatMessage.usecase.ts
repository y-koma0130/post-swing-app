import type { Actor } from '@/server/utils/actor'
import { err, ok, type Result } from '@/server/utils/result'
import { CHAT_RULES } from '../../domain/rules'
import { countRemainingStudentMessages } from '../../domain/services/countRemainingStudentMessages.service'
import { nextStatusAfter } from '../../domain/services/nextStatusAfter.service'
import type { ChatSender } from '../../domain/values/ChatMessage'
import type { Thread } from '../../domain/values/Thread'
import type { ThreadStatus } from '../../domain/values/ThreadStatus'

export type NewChatMessage = Readonly<{
  id: string
  threadId: string
  videoId: string
  senderRole: ChatSender
  senderUserId: string
  body: string
  sentAt: Date
  nextStatus: ThreadStatus
}>

export type SendChatMessageParams = Readonly<{
  actor: Actor
  threadId: string
  videoId: string
  body: string
  now: Date
}>

type Dependencies = Readonly<{
  findThread: (threadId: string) => Promise<Thread | null>
  saveChatMessage: (message: NewChatMessage) => Promise<void>
  /** 相手に知らせる（キューに積むだけ） */
  notifyChatMessage: (input: {
    threadId: string
    to: ChatSender
    recipientUserId: string
  }) => Promise<void>
  generateId: () => string
}>

export type SendChatMessageError = 'not_found' | 'closed' | 'empty' | 'too_long' | 'limit_reached'

export type SendChatMessage = (
  params: SendChatMessageParams,
  dependencies: Dependencies
) => Promise<Result<{ messageId: string }, SendChatMessageError>>

/**
 * チャットを送る（動画ごと）
 *
 * ドメインルール:
 * - スレッドのコーチと生徒だけ
 * - 生徒は動画1本につき3通まで。コーチは無制限
 * - 終了したスレッドには送れない
 */
export const sendChatMessage: SendChatMessage = async (params, deps) => {
  const thread = await deps.findThread(params.threadId)
  const role: ChatSender | null =
    thread?.coachUserId === params.actor.userId
      ? 'coach'
      : thread?.studentUserId === params.actor.userId
        ? 'student'
        : null
  if (!thread || role === null || !thread.videos.some((v) => v.id === params.videoId)) {
    return err('not_found')
  }
  if (thread.status === 'closed') return err('closed')
  const body = params.body.trim()
  if (body.length === 0) return err('empty')
  if (body.length > CHAT_RULES.maxLength) return err('too_long')
  if (role === 'student' && countRemainingStudentMessages(thread, params.videoId) === 0) {
    return err('limit_reached')
  }

  const messageId = deps.generateId()
  await deps.saveChatMessage({
    id: messageId,
    threadId: thread.id,
    videoId: params.videoId,
    senderRole: role,
    senderUserId: params.actor.userId,
    body,
    sentAt: params.now,
    nextStatus: nextStatusAfter(thread, role === 'coach' ? 'coach_chatted' : 'student_chatted'),
  })
  await deps.notifyChatMessage(
    role === 'coach'
      ? { threadId: thread.id, to: 'student', recipientUserId: thread.studentUserId }
      : { threadId: thread.id, to: 'coach', recipientUserId: thread.coachUserId }
  )
  return ok({ messageId })
}
