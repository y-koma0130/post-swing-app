import { err, ok, type Result } from '@/server/utils/result'
import type { ChatQuote, QuoteKind } from '../values/ChatMessage'
import type { KeyPosition } from '../values/KeyPosition'
import type { Thread } from '../values/Thread'

const EXCERPT_LENGTH = 40

export type QuoteRequest = Readonly<{ kind: QuoteKind; targetId: string }>

/** スレッドの添削カード（引用先を確かめるのに使う） */
export type ThreadCard = Readonly<{ id: string; submissionId: string; position: KeyPosition }>

export type CheckQuoteTarget = (
  input: Readonly<{
    thread: Pick<Thread, 'submissions' | 'messages'>
    cards: ReadonlyArray<ThreadCard>
    request: QuoteRequest
  }>
) => Result<ChatQuote, 'invalid_quote'>

/**
 * 引用先がこのスレッドの中にあるかを確かめ、送った時点の様子を写す
 *
 * ドメインルール:
 * - 引用できるのは、このスレッドの提出の動画・コーチがチャットで送った動画・添削カード・メッセージ
 * - メッセージは本文の冒頭40文字を写す。本文のない添付だけのメッセージは、添付の種類を写す
 */
export const checkQuoteTarget: CheckQuoteTarget = ({ thread, cards, request }) => {
  const { kind, targetId } = request
  if (kind === 'video') {
    const index = thread.submissions.findIndex((s) => s.videos.some((v) => v.id === targetId))
    const video = thread.submissions[index]?.videos.find((v) => v.id === targetId)
    if (video) return ok({ kind, targetId, submissionIndex: index, angle: video.angle })
    const sentInChat = thread.messages.some(
      (m) => m.attachment.kind === 'video' && m.attachment.videoId === targetId
    )
    return sentInChat
      ? ok({ kind, targetId, submissionIndex: null, angle: null })
      : err('invalid_quote')
  }
  if (kind === 'card') {
    const card = cards.find((c) => c.id === targetId)
    const index = card ? thread.submissions.findIndex((s) => s.id === card.submissionId) : -1
    return card && index >= 0
      ? ok({ kind, targetId, submissionIndex: index, position: card.position })
      : err('invalid_quote')
  }
  const message = thread.messages.find((m) => m.id === targetId)
  if (!message) return err('invalid_quote')
  const excerpt =
    message.body.trim() !== ''
      ? message.body.trim().slice(0, EXCERPT_LENGTH)
      : message.attachment.kind === 'drill'
        ? `ドリル：${message.attachment.title}`
        : '動画'
  return ok({ kind, targetId, from: message.from, excerpt })
}
