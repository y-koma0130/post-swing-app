import { Badge } from '@/app/components/ui/Badge'
import type { ThreadSummaryPageDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import { groupCoachLessons } from '../utils/lessonGroups'
import { FinishedLessonList } from './FinishedLessonList'
import { ThreadList } from './ThreadList'

type Props = {
  lessons: ThreadSummaryPageDto
  now: Date
  /** 完了の「もっと見る」の行き先 */
  moreHref: string
}

const Heading = ({ title, count, urgent }: { title: string; count: number; urgent: boolean }) => (
  <h2 className="text-heading flex items-center gap-2">
    {title}
    {urgent && count > 0 ? (
      <Badge tone="mint">{count}件</Badge>
    ) : (
      <span className="text-caption text-muted font-normal">{count}件</span>
    )}
  </h2>
)

/**
 * コーチのホームのレッスン一覧
 *
 * - 申し込み（承認待ち）：48時間で自動でお断りになるので、進行中とは分けて先頭に出す
 * - 進行中：添削待ちとチャットの未読をまとめる。添削待ちは返事の目安が近い順
 * - 完了：終わった新しい順。サーバーで10件ずつ読む
 */
export const CoachThreadSections = ({ lessons, now, moreHref }: Props) => {
  const { requested, active } = groupCoachLessons(lessons.active)
  const needsAction = active.filter((t) => t.status === 'waiting_coach' || t.unread).length
  return (
    <div className="space-y-8">
      {requested.length > 0 && (
        <section className="space-y-3">
          <Heading title="申し込み（承認待ち）" count={requested.length} urgent />
          <ThreadList threads={requested} viewer="coach" now={now} />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-heading flex items-center gap-2">
          進行中のレッスン
          <span className="text-caption text-muted font-normal">{active.length}件</span>
          {needsAction > 0 && <Badge tone="mint">対応 {needsAction}件</Badge>}
        </h2>
        {active.length === 0 ? (
          <p className="text-muted text-sm">進行中のレッスンはありません。</p>
        ) : (
          <ThreadList threads={active} viewer="coach" now={now} />
        )}
      </section>
      {lessons.finishedTotal > 0 && (
        <section className="space-y-3">
          <Heading title="完了したレッスン" count={lessons.finishedTotal} urgent={false} />
          <FinishedLessonList
            threads={lessons.finished}
            total={lessons.finishedTotal}
            moreHref={moreHref}
            viewer="coach"
          />
        </section>
      )}
    </div>
  )
}
