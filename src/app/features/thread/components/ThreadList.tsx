import Link from 'next/link'
import { Card } from '@/app/components/ui/Card'
import { formatMonthDay } from '@/app/utils/format'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'

const STATUS_LABEL = {
  coach: { waiting_coach: '返信待ち', waiting_student: '生徒の番', closed: '完了' },
  student: { waiting_coach: '添削待ち', waiting_student: 'あなたの番', closed: '完了' },
} as const satisfies Record<'coach' | 'student', Record<ThreadStatus, string>>

type Props = {
  threads: ThreadSummaryDto[]
  /** 見ている人。リンク先と状態の言い方が変わる */
  viewer: 'coach' | 'student'
}

export const ThreadList = ({ threads, viewer }: Props) => (
  <ul className="space-y-3">
    {threads.map((t) => (
      <li key={t.id}>
        <Link href={viewer === 'coach' ? `/coach/threads/${t.id}` : `/t/${t.id}`}>
          <Card className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold">{t.counterpartName}</p>
              <p className="truncate text-sm text-gray-500">
                {t.theme === '' ? '（まだ動画が届いていません）' : t.theme}
              </p>
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className={`font-bold ${t.status === 'closed' ? 'text-gray-400' : 'text-ink'}`}>
                {STATUS_LABEL[viewer][t.status]}
              </p>
              <p className="text-gray-500">
                動画 {t.videoCount}本・期限 {formatMonthDay(t.expiresAt)}
              </p>
            </div>
          </Card>
        </Link>
      </li>
    ))}
  </ul>
)
