import type { CoachAvailability } from '@/server/features/coach/domain/values/CoachAvailability'

/**
 * 送る前の確認
 * - none: 確認なしで送る
 * - confirm: 毎回確認する
 * - confirm_with_skip: 確認する。「この不在期間中は次から表示しない」を選べる
 */
export type SendGuard = 'none' | 'confirm' | 'confirm_with_skip'

export type DecideSendGuard = (
  input: Readonly<{
    availability: CoachAvailability
    target: 'video' | 'chat'
    /** この不在期間について、生徒が「次から表示しない」を選んだか */
    acknowledged: boolean
  }>
) => SendGuard

/**
 * ドメインルール:
 * - 動画：不在中・返信遅れのときは、毎回確認する（添削の待ち時間が大きく変わるため）
 * - チャット：不在中は確認する（次から表示しないを選べる）。返信遅れのときは確認しない（一行の表示だけ）
 * - 通常は確認しない
 */
export const decideSendGuard: DecideSendGuard = ({ availability, target, acknowledged }) => {
  if (availability.kind === 'available') return 'none'
  if (target === 'video') return 'confirm'
  if (availability.kind === 'delayed') return 'none'
  return acknowledged ? 'none' : 'confirm_with_skip'
}
