import { Card } from '@/app/components/ui/Card'
import { formatMonthDay } from '@/app/utils/format'
import type { CoachReviewSummaryDto } from '@/server/features/coach-review/application/dto/CoachReviewSummary.dto'

type Props = {
  summary: CoachReviewSummaryDto
}

/** 受付ページのレビュー */
export const ReviewSummary = ({ summary }: Props) => {
  if (summary.count === 0 || summary.average === null) return null
  return (
    <section className="space-y-3">
      <h2 className="font-bold">
        レビュー <span className="text-mint">★{summary.average.toFixed(1)}</span>
        <span className="ml-1 text-sm font-normal text-gray-500">（{summary.count}件）</span>
      </h2>
      <ul className="space-y-3">
        {summary.recent.map((review) => (
          <li key={review.id}>
            <Card className="space-y-2">
              <p className="text-sm">
                <span className="text-mint font-bold">{'★'.repeat(review.rating)}</span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatMonthDay(review.createdAt)}
                </span>
              </p>
              {review.comment && (
                <p className="text-sm whitespace-pre-wrap text-gray-700">{review.comment}</p>
              )}
              {review.coachReply && (
                <p className="rounded-xl bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-600">
                  コーチより：{review.coachReply}
                </p>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
