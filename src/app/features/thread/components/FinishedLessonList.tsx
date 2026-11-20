import Link from 'next/link'
import { ShowMoreList } from '@/app/components/ShowMoreList'
import { Badge } from '@/app/components/ui/Badge'
import { formatMonthDay } from '@/app/utils/format'
import { THREAD_STATUS_LABEL } from '@/app/utils/threadText'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import { FINISHED_PAGE_SIZE } from '../utils/lessonGroups'

type Props = {
  threads: ThreadSummaryDto[]
  viewer: 'coach' | 'student'
  /** 相手の名前を出すか（相手が決まっているページでは、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

/**
 * 終わったレッスンの一覧。増え続けるので、カードではなく区切り線の行にして、
 * はじめは10件だけ出す（あとは「もっと見る」）
 */
export const FinishedLessonList = ({ threads, viewer, showCounterpart = true }: Props) => (
  <ShowMoreList
    pageSize={FINISHED_PAGE_SIZE}
    className="divide-line-soft border-line-soft divide-y border-y"
    items={threads.map((t) => ({
      key: t.id,
      node: (
        <Link
          href={viewer === 'coach' ? `/coach/threads/${t.id}` : `/t/${t.id}`}
          className="hover:bg-surface active:bg-surface focus-visible:ring-mint flex items-center gap-3 px-1 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {showCounterpart ? t.counterpartName || '（名前なし）' : t.theme || '（テーマなし）'}
            </p>
            <p className="text-caption text-muted truncate">
              {showCounterpart && t.theme ? `${t.theme}・` : ''}
              {t.finishedAt
                ? `${formatMonthDay(t.finishedAt)}に${t.status === 'declined' ? 'お断り' : '終了'}`
                : THREAD_STATUS_LABEL[viewer][t.status]}
            </p>
          </div>
          {viewer === 'student' && t.needsReview ? (
            <Badge tone="mint">レビューを書く</Badge>
          ) : (
            t.status === 'declined' && (
              <Badge tone="neutral">{THREAD_STATUS_LABEL[viewer].declined}</Badge>
            )
          )}
          <span aria-hidden className="text-muted shrink-0 text-xl leading-none">
            ›
          </span>
        </Link>
      ),
    }))}
  />
)
