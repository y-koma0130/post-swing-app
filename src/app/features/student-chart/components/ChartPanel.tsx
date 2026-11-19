import Link from 'next/link'
import type { StudentChartDto } from '@/server/features/student-chart/application/dto/StudentChart.dto'
import { ChartEntries } from './ChartEntries'
import { ChartMemo } from './ChartMemo'
import { ChartTags } from './ChartTags'

type Props = {
  chart: StudentChartDto
  /** いま開いているスレッド（記録に付ける） */
  threadId: string
}

/**
 * 添削画面に置くカルテ（コーチだけ）。ふだんは畳んでおき、開くとタグ・メモ・最近の記録を見て書ける
 */
export const ChartPanel = ({ chart, threadId }: Props) => (
  <details className="group rounded-card border-line-soft border bg-white shadow-sm">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0">
        <span className="text-heading">カルテ</span>
        <span className="text-caption text-muted ml-2">生徒には見えません</span>
        {chart.tags.length > 0 && (
          <span className="text-caption text-muted ml-2 truncate">{chart.tags.join('・')}</span>
        )}
      </span>
      <span className="text-caption text-muted shrink-0">
        <span className="group-open:hidden">開く ▾</span>
        <span className="hidden group-open:inline">閉じる ▴</span>
      </span>
    </summary>
    <div className="space-y-4 px-4 pb-4">
      <ChartTags studentUserId={chart.studentUserId} tags={chart.tags} />
      <ChartMemo studentUserId={chart.studentUserId} memo={chart.memo} rows={4} />
      <div className="space-y-2">
        <h3 className="text-sm font-bold">レッスンの記録</h3>
        <ChartEntries
          studentUserId={chart.studentUserId}
          entries={chart.entries}
          threadId={threadId}
          limit={3}
        />
      </div>
      <Link href={`/coach/students/${chart.studentUserId}`} className="text-sm underline">
        カルテを開く（これまでのスレッド・送ったドリル）
      </Link>
    </div>
  </details>
)
