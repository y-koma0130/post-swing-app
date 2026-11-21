import { err, ok, type Result } from '@/server/utils/result'
import { CHAT_RULES } from '../rules'
import type { ChatSender } from '../values/ChatMessage'
import type { Thread } from '../values/Thread'
import { isFinished, isInLesson } from '../values/ThreadStatus'
import type { ChatAttachmentRequest } from './checkChatAttachment.service'
import { countRemainingStudentMessages } from './countRemainingStudentMessages.service'

export type ChatBlocker =
  | 'closed'
  | 'not_started'
  | 'empty'
  | 'too_long'
  | 'no_submission'
  | 'limit_reached'
  | 'attachment_not_allowed'

export type CheckChatMessage = (
  input: Readonly<{
    thread: Pick<Thread, 'status' | 'planKind' | 'submissions' | 'messages'>
    sender: ChatSender
    body: string
    /** 添えるもの（中身の確認は checkChatAttachment） */
    attachmentKind: ChatAttachmentRequest['kind']
  }>
) => Result<{ body: string }, ChatBlocker>

/**
 * 生徒がいまチャットを送れるか（本文によらない条件）。送れないときは理由を返す。画面の入力欄の出し分けにも使う
 */
export const studentChatBlocker = (
  thread: Pick<Thread, 'status' | 'planKind' | 'submissions' | 'messages'>
): Extract<ChatBlocker, 'closed' | 'not_started' | 'no_submission' | 'limit_reached'> | null => {
  if (isFinished(thread.status)) return 'closed'
  if (!isInLesson(thread.status)) return 'not_started'
  if (thread.submissions.length === 0) return 'no_submission'
  if (countRemainingStudentMessages(thread) === 0) return 'limit_reached'
  return null
}

/**
 * チャットを送れるか。送れるなら、前後の空白を除いた本文を返す
 *
 * ドメインルール:
 * - 終了したスレッドには送れない
 * - 申し込みの下書き・承認待ちのあいだは、どちらも送れない（承認してから会話を始める）
 * - 本文は1000文字まで。空なら送れない（コーチがドリル・動画を添えるときは本文なしでよい）
 * - 生徒はテキストだけ（動画は提出で送る）
 * - 生徒は、最初の提出をしてから送れる（テーマと動画がそろってから会話を始める）
 * - 生徒はスレッド全体の上限まで（コーチは無制限）
 */
export const checkChatMessage: CheckChatMessage = ({ thread, sender, body, attachmentKind }) => {
  if (isFinished(thread.status)) return err('closed')
  if (!isInLesson(thread.status)) return err('not_started')
  if (sender === 'student' && attachmentKind !== 'none') return err('attachment_not_allowed')
  const trimmed = body.trim()
  if (trimmed.length === 0 && attachmentKind === 'none') return err('empty')
  if (trimmed.length > CHAT_RULES.maxLength) return err('too_long')
  const blocker = sender === 'student' ? studentChatBlocker(thread) : null
  if (blocker) return err(blocker)
  return ok({ body: trimmed })
}
