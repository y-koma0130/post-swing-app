import Link from 'next/link'
import { Card } from '@/app/components/ui/Card'
import { formatMonthDay } from '@/app/utils/format'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'

const STATUS_LABEL = {
  waiting_coach: '返信待ち',
  waiting_student: '生徒の返信待ち',
  closed: '完了',
} as const satisfies Record<ThreadStatus, string>

type Props = {
  threads: ThreadSummaryDto[]
}

export const ThreadList = ({ threads }: Props) => (
  <ul className="space-y-3">
    {threads.map((t) => (
      <li key={t.id}>
        <Link href={`/coach/threads/${t.id}`}>
          <Card className="flex items-center justify-between">
            <div>
              <p className="font-bold">{t.studentName}</p>
              <p className="text-sm text-gray-500">{t.theme}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-ink font-bold">{STATUS_LABEL[t.status]}</p>
              <p className="text-gray-500">期限 {formatMonthDay(t.expiresAt)}</p>
            </div>
          </Card>
        </Link>
      </li>
    ))}
  </ul>
)
