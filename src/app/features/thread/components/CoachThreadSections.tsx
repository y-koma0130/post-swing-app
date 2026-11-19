import { Badge } from '@/app/components/ui/Badge'
import { buttonClass } from '@/app/components/ui/Button'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import { ThreadList } from './ThreadList'

type SectionDef = {
  key: string
  statuses: ReadonlyArray<ThreadStatus>
  title: string
  empty: string | null
  /** 件数を目立たせる（コーチが動く番） */
  urgent: boolean
  /** 数が増えていくので畳む */
  folded: boolean
}

/** コーチが先に見るべき順（申し込み → 添削待ち → レッスン中 → 完了）。empty が null なら、0件のとき出さない */
const SECTIONS = [
  {
    key: 'requested',
    statuses: ['requested'],
    title: '申し込み（承認待ち）',
    empty: null,
    urgent: true,
    folded: false,
  },
  {
    key: 'waiting_coach',
    statuses: ['waiting_coach'],
    title: '添削待ち',
    empty: '添削待ちのスレッドはありません。',
    urgent: true,
    folded: false,
  },
  {
    key: 'waiting_student',
    statuses: ['waiting_student'],
    title: 'レッスン中',
    empty: null,
    urgent: false,
    folded: false,
  },
  {
    key: 'finished',
    statuses: ['closed', 'declined'],
    title: '完了',
    empty: null,
    urgent: false,
    folded: true,
  },
] as const satisfies ReadonlyArray<SectionDef>

type SectionProps = {
  section: SectionDef
  threads: ThreadSummaryDto[]
}

const Section = ({ section, threads }: SectionProps) => {
  const heading = (
    <h2 className="text-heading flex items-center gap-2">
      {section.title}
      {section.urgent && threads.length > 0 ? (
        <Badge tone="mint">{threads.length}件</Badge>
      ) : (
        <span className="text-caption text-muted font-normal">{threads.length}件</span>
      )}
    </h2>
  )
  const body =
    threads.length === 0 ? (
      <p className="text-muted text-sm">{section.empty}</p>
    ) : (
      <ThreadList threads={threads} viewer="coach" />
    )

  if (section.folded) {
    return (
      <details className="group">
        {/* 見出しの行全体を押せるようにし、右端にボタンの形で「表示する／閉じる」を出す */}
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
          {heading}
          <span className={buttonClass({ variant: 'secondary', size: 'sm' })}>
            <span className="group-open:hidden">表示する</span>
            <span className="hidden group-open:inline">閉じる</span>
            <span aria-hidden className="inline-block transition-transform group-open:rotate-180">
              ▾
            </span>
          </span>
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
      const statuses: ReadonlyArray<ThreadStatus> = section.statuses
      const items = threads.filter((t) => statuses.includes(t.status))
      if (items.length === 0 && section.empty === null) return null
      return <Section key={section.key} section={section} threads={items} />
    })}
  </div>
)
