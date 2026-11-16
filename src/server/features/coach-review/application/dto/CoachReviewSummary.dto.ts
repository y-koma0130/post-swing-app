/** 受付ページに出すレビュー（生徒の名前は出さない） */
export type CoachReviewSummaryDto = {
  count: number
  /** 平均の星（小数1桁）。レビューがなければ null */
  average: number | null
  recent: Array<{
    id: string
    rating: number
    comment: string
    coachReply: string | null
    createdAt: Date
  }>
}
