import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import { ThreadList } from './ThreadList'

type SectionDef = { status: ThreadStatus; title: string; empty: string | null }

/** コーチが先に見るべき順（添削待ち → 生徒の番 → 完了）。empty が null なら、0件のとき出さない */
const SECTIONS = [
  { status: 'waiting_coach', title: '添削待ち', empty: '添削待ちのスレッドはありません。' },
  { status: 'waiting_student', title: '生徒の番', empty: null },
  { status: 'closed', title: '完了', empty: null },
] as const satisfies ReadonlyArray<SectionDef>

type SectionProps = {
  section: SectionDef
  threads: ThreadSummaryDto[]
}

const Section = ({ section, threads }: SectionProps) => {
  const heading = (
    <h2 className="text-heading flex items-center gap-2">
      {section.title}
      <span className="text-caption text-muted font-normal">{threads.length}件</span>
    </h2>
  )
  const body =
    threads.length === 0 ? (
      <p className="text-muted text-sm">{section.empty}</p>
    ) : (
      <ThreadList threads={threads} viewer="coach" />
    )

  // 完了は数が増えていくので、畳んでおく
  if (section.status === 'closed') {
    return (
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-2">
          {heading}
          <span className="text-caption text-muted group-open:hidden">表示する</span>
        </summary>
        <div className="pt-3">{body}</div>
      </details>
    )
  }
  return (
    <section className="space-y-3">
      {heading}
      {body}
    </section>
  )
}

type Props = {
  threads: ThreadSummaryDto[]
}

/** コーチのホームのスレッド一覧。状態ごとに分けて件数を見出しに出す */
export const CoachThreadSections = ({ threads }: Props) => (
  <div className="space-y-8">
    {SECTIONS.map((section) => {
      const items = threads.filter((t) => t.status === section.status)
      if (items.length === 0 && section.empty === null) return null
      return <Section key={section.status} section={section} threads={items} />
    })}
  </div>
)
