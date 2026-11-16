import { REPLY_RULES } from '../rules'
import type { Submission } from '../values/Submission'
import type { Thread } from '../values/Thread'

export type ReplyBlocker =
  | 'closed'
  | 'already_replied'
  | 'no_cards'
  | 'too_many_cards'
  | 'image_too_large'
  | 'invalid_video'
  | 'comment_required'
  | 'comment_too_long'
  | 'too_many_drills'
  | 'invalid_drill'

/** videoId：画像を作った動画（その提出の動画のどれか） */
type ReplyCard = Readonly<{ imageBytes: number; videoId: string }>

export type CheckReplySubmission = (
  input: Readonly<{
    thread: Pick<Thread, 'status'>
    submission: Pick<Submission, 'replied' | 'videos'>
    cards: ReadonlyArray<ReplyCard>
    /** 添削全体の説明 */
    comment: string
    /** おすすめのドリル（重複は除いてある） */
    drillIds: ReadonlyArray<string>
    /** drillIds のうち、このコーチ自身のもの */
    ownDrillIds: ReadonlyArray<string>
  }>
) => ReplyBlocker | null

/**
 * コーチが提出に添削を返せるか。できないときは理由を返す
 *
 * ドメインルール:
 * - 終了したスレッドには返せない（期限が過ぎても、期限内に届いた提出には返せる）
 * - 提出1回に添削は1通（追加の説明はチャットで）
 * - 画像は1〜8枚、1枚5MBまで。その提出の動画（正面・後方など）のどれからでも作れる
 * - 説明（こうしてほしい）は必ず書く。2000文字まで
 * - おすすめのドリルは3つまで、そのコーチ自身のもの
 */
export const checkReplySubmission: CheckReplySubmission = ({
  thread,
  submission,
  cards,
  comment,
  drillIds,
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
  const trimmed = comment.trim()
  if (trimmed.length === 0) return 'comment_required'
  if (trimmed.length > REPLY_RULES.maxCommentLength) return 'comment_too_long'
  if (drillIds.length > REPLY_RULES.maxDrills) return 'too_many_drills'
  if (drillIds.some((id) => !ownDrillIds.includes(id))) return 'invalid_drill'
  return null
}
