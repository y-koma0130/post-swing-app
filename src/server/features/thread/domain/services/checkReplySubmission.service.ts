import { REPLY_RULES } from '../rules'
import type { Thread } from '../values/Thread'

export type ReplyBlocker =
  | 'closed'
  | 'already_replied'
  | 'no_cards'
  | 'too_many_cards'
  | 'image_too_large'
  | 'invalid_drill'

type ReplyCard = Readonly<{ imageBytes: number; drillId: string | null }>

/** カードに付けたドリル（重複なし） */
export const requestedDrillIds = (cards: ReadonlyArray<ReplyCard>): string[] => [
  ...new Set(cards.flatMap((card) => (card.drillId ? [card.drillId] : []))),
]

export type CheckReplySubmission = (
  input: Readonly<{
    thread: Pick<Thread, 'status'>
    video: Readonly<{ replied: boolean }>
    cards: ReadonlyArray<ReplyCard>
    /** 付けたドリルのうち、このコーチ自身のもの */
    ownDrillIds: ReadonlyArray<string>
  }>
) => ReplyBlocker | null

/**
 * コーチが動画に返信できるか。できないときは理由を返す
 *
 * ドメインルール:
 * - 終了したスレッドには返信できない（期限が過ぎても、期限内に届いた動画には返信できる）
 * - 動画1本に返信は1通（追加の説明はチャットで）
 * - カードは1〜8枚、画像は1枚5MBまで
 * - 付けられるのは、そのコーチ自身のドリルだけ
 */
export const checkReplySubmission: CheckReplySubmission = ({
  thread,
  video,
  cards,
  ownDrillIds,
}) => {
  if (thread.status === 'closed') return 'closed'
  if (video.replied) return 'already_replied'
  if (cards.length === 0) return 'no_cards'
  if (cards.length > REPLY_RULES.maxCards) return 'too_many_cards'
  if (cards.some((c) => c.imageBytes <= 0 || c.imageBytes > REPLY_RULES.maxImageBytes)) {
    return 'image_too_large'
  }
  if (requestedDrillIds(cards).some((id) => !ownDrillIds.includes(id))) return 'invalid_drill'
  return null
}
