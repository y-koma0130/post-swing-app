export type ReviewBlocker = 'not_closed' | 'already_reviewed'

export type CheckReviewSubmission = (
  thread: Readonly<{ closed: boolean; reviewed: boolean }>
) => ReviewBlocker | null

/**
 * 生徒がコーチへのレビューを書けるか
 *
 * ドメインルール:
 * - スレッドが終わってから書ける（途中の評価にしない）
 * - 1つのスレッドに1回だけ
 */
export const checkReviewSubmission: CheckReviewSubmission = (thread) => {
  if (!thread.closed) return 'not_closed'
  if (thread.reviewed) return 'already_reviewed'
  return null
}
