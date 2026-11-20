import { Badge } from '@/app/components/ui/Badge'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import { groupCoachLessons } from '../utils/lessonGroups'
import { FinishedLessonList } from './FinishedLessonList'
import { ThreadList } from './ThreadList'

type Props = {
  threads: ThreadSummaryDto[]
  now: Date
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
 * - 完了：終わった新しい順。はじめは10件
 */
export const CoachThreadSections = ({ threads, now }: Props) => {
  const { requested, active, finished } = groupCoachLessons(threads)
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
      {finished.length > 0 && (
        <section className="space-y-3">
          <Heading title="完了したレッスン" count={finished.length} urgent={false} />
          <FinishedLessonList threads={finished} viewer="coach" />
        </section>
      )}
    </div>
  )
}
