import { err, ok, type Result } from '@/server/utils/result'
import { CHAT_RULES } from '../rules'
import type { ChatSender } from '../values/ChatMessage'
import type { Thread } from '../values/Thread'
import { countRemainingStudentMessages } from './countRemainingStudentMessages.service'

export type ChatBlocker = 'closed' | 'empty' | 'too_long' | 'limit_reached'

export type CheckChatMessage = (
  input: Readonly<{
    thread: Pick<Thread, 'status' | 'messages'>
    videoId: string
    sender: ChatSender
    body: string
  }>
) => Result<{ body: string }, ChatBlocker>

/**
 * チャットを送れるか。送れるなら、前後の空白を除いた本文を返す
 *
 * ドメインルール:
 * - 終了したスレッドには送れない
 * - 空の本文は送れない。1000文字まで
 * - 生徒は動画1本ごとの上限まで（コーチは無制限）
 */
export const checkChatMessage: CheckChatMessage = ({ thread, videoId, sender, body }) => {
  if (thread.status === 'closed') return err('closed')
  const trimmed = body.trim()
  if (trimmed.length === 0) return err('empty')
  if (trimmed.length > CHAT_RULES.maxLength) return err('too_long')
  if (sender === 'student' && countRemainingStudentMessages(thread, videoId) === 0) {
    return err('limit_reached')
  }
  return ok({ body: trimmed })
}
