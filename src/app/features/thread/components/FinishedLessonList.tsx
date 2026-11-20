import Link from 'next/link'
import { Badge } from '@/app/components/ui/Badge'
import { textButtonClass } from '@/app/components/ui/Button'
import { PRESSED_CLASS } from '@/app/components/ui/pressStyles'
import { formatMonthDay } from '@/app/utils/format'
import { THREAD_STATUS_LABEL } from '@/app/utils/threadText'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'

type Props = {
  /** 出す分（終わった新しい順。サーバーで件数を決めて読んだもの） */
  threads: ThreadSummaryDto[]
  /** 終わったレッスンの合計（出していない分があれば「もっと見る」を出す） */
  total: number
  /** 「もっと見る」の行き先（同じページで、出す件数を増やす） */
  moreHref: string
  viewer: 'coach' | 'student'
  /** 相手の名前を出すか（相手が決まっているページでは、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

/**
 * 終わったレッスンの一覧。増え続けるので、カードではなく区切り線の行にして、
 * サーバーで決まった数だけ読む（「もっと見る」で数を増やして読み直す）
 */
export const FinishedLessonList = ({
  threads,
  total,
  moreHref,
  viewer,
  showCounterpart = true,
}: Props) => (
  <div className="space-y-3">
    <ul className="divide-line-soft border-line-soft divide-y border-y">
      {threads.map((t) => (
        <li key={t.id}>
          <Link
            href={viewer === 'coach' ? `/coach/threads/${t.id}` : `/t/${t.id}`}
            className={`hover:bg-surface ${PRESSED_CLASS} focus-visible:ring-mint flex items-center gap-3 px-1 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {showCounterpart
                  ? t.counterpartName || '（名前なし）'
                  : t.theme || '（テーマなし）'}
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
        </li>
      ))}
    </ul>
    {total > threads.length && (
      // 読み直すだけなので、いまの場所から動かさない
      <Link href={moreHref} scroll={false} className={textButtonClass()}>
        もっと見る（あと{total - threads.length}件）
      </Link>
    )}
  </div>
)
