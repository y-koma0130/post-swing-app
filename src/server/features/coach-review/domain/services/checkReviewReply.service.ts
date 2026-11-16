export type ReviewReplyBlocker = 'already_replied'

export type CheckReviewReply = (review: Readonly<{ replied: boolean }>) => ReviewReplyBlocker | null

/**
 * コーチがレビューに返信できるか
 *
 * ドメインルール:
 * - 返信は1回だけ（受付ページにレビューと並べて出すので、書き換えの履歴を残さない）
 */
export const checkReviewReply: CheckReviewReply = (review) =>
  review.replied ? 'already_replied' : null
