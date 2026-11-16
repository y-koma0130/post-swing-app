import Link from 'next/link'
import { Badge, type BadgeTone } from '@/app/components/ui/Badge'
import { Card } from '@/app/components/ui/Card'
import { formatMonthDay } from '@/app/utils/format'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'

const STATUS_LABEL = {
  coach: { waiting_coach: '添削待ち', waiting_student: 'レッスン中', closed: '完了' },
  student: { waiting_coach: '添削待ち', waiting_student: 'レッスン中', closed: '完了' },
} as const satisfies Record<'coach' | 'student', Record<ThreadStatus, string>>

/** 見ている人が動く番なら目立たせる（コーチは返信待ち、生徒は自分の番） */
const STATUS_TONE = {
  coach: { waiting_coach: 'mint', waiting_student: 'neutral', closed: 'neutral' },
  student: { waiting_coach: 'neutral', waiting_student: 'mint', closed: 'neutral' },
} as const satisfies Record<'coach' | 'student', Record<ThreadStatus, BadgeTone>>

type Props = {
  threads: ThreadSummaryDto[]
  /** 見ている人。リンク先と状態の言い方が変わる */
  viewer: 'coach' | 'student'
  /** 相手の名前を出すか（コーチ詳細ページのように相手が決まっているときは出さず、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

export const ThreadList = ({ threads, viewer, showCounterpart = true }: Props) => (
  <ul className="space-y-3">
    {threads.map((t) => (
      <li key={t.id}>
        <Link href={viewer === 'coach' ? `/coach/threads/${t.id}` : `/t/${t.id}`}>
          <Card className="hover:border-line flex items-center justify-between gap-4 transition-colors">
            <div className="min-w-0">
              {showCounterpart && (
                <p className="font-bold">{t.counterpartName || '（名前なし）'}</p>
              )}
              <p className={showCounterpart ? 'text-muted truncate text-sm' : 'truncate font-bold'}>
                {t.theme === '' ? '（まだ動画が届いていません）' : t.theme}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="flex gap-1">
                {t.unread && <Badge tone="warning">未読</Badge>}
                <Badge tone={STATUS_TONE[viewer][t.status]}>{STATUS_LABEL[viewer][t.status]}</Badge>
              </span>
              <p className="text-caption text-muted">
                提出 {t.submissionCount}/{t.maxSubmissions}回・期限 {formatMonthDay(t.expiresAt)}
              </p>
            </div>
          </Card>
        </Link>
      </li>
    ))}
  </ul>
)
