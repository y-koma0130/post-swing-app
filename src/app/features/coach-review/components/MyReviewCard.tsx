import { Card } from '@/app/components/ui/Card'

type Props = {
  coachName: string
  review: Readonly<{ rating: number; comment: string; coachReply: string | null }>
}

/** 生徒のレッスンの画面：自分が書いたレビューと、コーチからの返信 */
export const MyReviewCard = ({ coachName, review }: Props) => (
  <Card className="space-y-3">
    <div className="space-y-1">
      <p className="text-sm font-bold">
        あなたのレビュー <span className="text-mint-text">{'★'.repeat(review.rating)}</span>
      </p>
      {review.comment && <p className="text-body text-sm whitespace-pre-wrap">{review.comment}</p>}
    </div>
    {review.coachReply ? (
      <div className="bg-mint-soft space-y-1 rounded-xl p-3">
        <p className="text-caption font-bold">{coachName} さんからの返信</p>
        <p className="text-body text-sm whitespace-pre-wrap">{review.coachReply}</p>
      </div>
    ) : (
      <p className="text-caption text-muted">
        {coachName} さんから返信が届くと、ここに表示されます（LINE でもお知らせします）。
      </p>
    )}
  </Card>
)
