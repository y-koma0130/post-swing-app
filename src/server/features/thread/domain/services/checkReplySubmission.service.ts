import { REPLY_RULES } from '../rules'
import type { Submission } from '../values/Submission'
import type { Thread } from '../values/Thread'

export type ReplyBlocker =
  | 'closed'
  | 'already_replied'
  | 'no_cards'
  | 'too_many_cards'
  | 'image_too_large'
  | 'invalid_drill'
  | 'invalid_video'

/** videoId：カードを作った動画（その提出の動画のどれか） */
type ReplyCard = Readonly<{ imageBytes: number; drillId: string | null; videoId: string }>

/** カードに付けたドリル（重複なし） */
export const requestedDrillIds = (cards: ReadonlyArray<ReplyCard>): string[] => [
  ...new Set(cards.flatMap((card) => (card.drillId ? [card.drillId] : []))),
]

export type CheckReplySubmission = (
  input: Readonly<{
    thread: Pick<Thread, 'status'>
    submission: Pick<Submission, 'replied' | 'videos'>
    cards: ReadonlyArray<ReplyCard>
    /** 付けたドリルのうち、このコーチ自身のもの */
    ownDrillIds: ReadonlyArray<string>
  }>
) => ReplyBlocker | null

/**
 * コーチが提出に添削を返せるか。できないときは理由を返す
 *
 * ドメインルール:
 * - 終了したスレッドには返せない（期限が過ぎても、期限内に届いた提出には返せる）
 * - 提出1回に添削は1通（追加の説明はチャットで）
 * - カードは、その提出の動画（正面・後方など）のどれからでも作れる
 * - カードは1〜8枚、画像は1枚5MBまで
 * - 付けられるのは、そのコーチ自身のドリルだけ
 */
export const checkReplySubmission: CheckReplySubmission = ({
  thread,
  submission,
  cards,
  ownDrillIds,
}) => {
  if (thread.status === 'closed') return 'closed'
  if (submission.replied) return 'already_replied'
  if (cards.length === 0) return 'no_cards'
  if (cards.length > REPLY_RULES.maxCards) return 'too_many_cards'
  if (cards.some((c) => c.imageBytes <= 0 || c.imageBytes > REPLY_RULES.maxImageBytes)) {
    return 'image_too_large'
  }
  if (cards.some((c) => !submission.videos.some((v) => v.id === c.videoId))) {
    return 'invalid_video'
  }
  if (requestedDrillIds(cards).some((id) => !ownDrillIds.includes(id))) return 'invalid_drill'
  return null
}
