import { err, ok, type Result } from '@/server/utils/result'
import { CHAT_RULES } from '../rules'
import type { ChatSender } from '../values/ChatMessage'
import type { Thread } from '../values/Thread'
import { countRemainingStudentMessages } from './countRemainingStudentMessages.service'

export type ChatBlocker = 'closed' | 'empty' | 'too_long' | 'no_submission' | 'limit_reached'

export type CheckChatMessage = (
  input: Readonly<{
    thread: Pick<Thread, 'status' | 'planKind' | 'submissions' | 'messages'>
    sender: ChatSender
    body: string
  }>
) => Result<{ body: string }, ChatBlocker>

/**
 * 生徒がいまチャットを送れるか（本文によらない条件）。送れないときは理由を返す。画面の入力欄の出し分けにも使う
 */
export const studentChatBlocker = (
  thread: Pick<Thread, 'status' | 'planKind' | 'submissions' | 'messages'>
): Extract<ChatBlocker, 'closed' | 'no_submission' | 'limit_reached'> | null => {
  if (thread.status === 'closed') return 'closed'
  if (thread.submissions.length === 0) return 'no_submission'
  if (countRemainingStudentMessages(thread) === 0) return 'limit_reached'
  return null
}

/**
 * チャットを送れるか。送れるなら、前後の空白を除いた本文を返す
 *
 * ドメインルール:
 * - 終了したスレッドには送れない
 * - 空の本文は送れない。1000文字まで
 * - 生徒は、最初の提出をしてから送れる（テーマと動画がそろってから会話を始める）
 * - 生徒はスレッド全体の上限まで（コーチは無制限）
 */
export const checkChatMessage: CheckChatMessage = ({ thread, sender, body }) => {
  if (thread.status === 'closed') return err('closed')
  const trimmed = body.trim()
  if (trimmed.length === 0) return err('empty')
  if (trimmed.length > CHAT_RULES.maxLength) return err('too_long')
  const blocker = sender === 'student' ? studentChatBlocker(thread) : null
  if (blocker) return err(blocker)
  return ok({ body: trimmed })
}
