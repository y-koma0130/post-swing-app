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
      <h2 className="text-heading">
        レビュー <span className="text-mint">★{summary.average.toFixed(1)}</span>
        <span className="text-muted ml-1 text-sm font-normal">（{summary.count}件）</span>
      </h2>
      <ul className="space-y-3">
        {summary.recent.map((review) => (
          <li key={review.id}>
            <Card className="space-y-2">
              <p className="text-sm">
                <span className="text-mint font-bold">{'★'.repeat(review.rating)}</span>
                <span className="text-caption text-muted ml-2">
                  {formatMonthDay(review.createdAt)}
                </span>
              </p>
              {review.comment && (
                <p className="text-body text-sm whitespace-pre-wrap">{review.comment}</p>
              )}
              {review.coachReply && (
                <p className="bg-surface text-caption text-muted rounded-lg p-3 whitespace-pre-wrap">
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
