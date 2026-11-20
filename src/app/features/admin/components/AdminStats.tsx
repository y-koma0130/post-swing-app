import { Card } from '@/app/components/ui/Card'
import type { AdminCoachStatsDto } from '@/server/features/coach/application/dto/AdminCoachStats.dto'
import type { AdminLessonStatsDto } from '@/server/features/thread/application/dto/AdminLessonStats.dto'

type Props = {
  coaches: AdminCoachStatsDto
  lessons: AdminLessonStatsDto
}

type Tile = Readonly<{ label: string; value: number; unit: string; note?: string }>

const Group = ({ title, tiles }: { title: string; tiles: ReadonlyArray<Tile> }) => (
  <Card className="space-y-3">
    <h2 className="text-heading">{title}</h2>
    <dl className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-surface rounded-xl p-3">
          <dt className="text-caption text-muted">{tile.label}</dt>
          <dd className="mt-1">
            <span className="text-title">{tile.value.toLocaleString('ja-JP')}</span>
            <span className="text-muted ml-1 text-sm">{tile.unit}</span>
          </dd>
          {tile.note && <p className="text-caption text-muted mt-0.5">{tile.note}</p>}
        </div>
      ))}
    </dl>
  </Card>
)

/** 管理画面の一番上の数（コーチ・生徒・レッスン）。デモは数えない。「今月」は日本時間の月 */
export const AdminStats = ({ coaches, lessons }: Props) => (
  <div className="grid gap-4 lg:grid-cols-3">
    <Group
      title="コーチ"
      tiles={[
        { label: '招待したコーチ', value: coaches.total, unit: '人' },
        {
          label: '受付中',
          value: coaches.accepting,
          unit: '人',
          note: '口座の登録が済み、止めていない',
        },
        { label: '口座の登録がまだ', value: coaches.payoutPending, unit: '人' },
        { label: '受付を止めている', value: coaches.suspended, unit: '人' },
      ]}
    />
    <Group
      title="生徒"
      tiles={[
        {
          label: 'レッスンを受けた生徒',
          value: lessons.students.total,
          unit: '人',
          note: 'これまでの合計',
        },
        { label: 'いまレッスン中', value: lessons.students.active, unit: '人' },
        { label: '今月はじめての生徒', value: lessons.students.newThisMonth, unit: '人' },
      ]}
    />
    <Group
      title="レッスン"
      tiles={[
        { label: '承認待ち', value: lessons.lessons.requested, unit: '件' },
        {
          label: '進行中',
          value: lessons.lessons.inLesson,
          unit: '件',
          note: '添削待ち・レッスン中',
        },
        { label: '今月始まった', value: lessons.lessons.startedThisMonth, unit: '件' },
        { label: '完了', value: lessons.lessons.finished, unit: '件', note: 'これまでの合計' },
      ]}
    />
  </div>
)
