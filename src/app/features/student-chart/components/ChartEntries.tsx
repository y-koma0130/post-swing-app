'use client'

import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { formatDateTime } from '@/app/utils/format'
import type { StudentChartDto } from '@/server/features/student-chart/application/dto/StudentChart.dto'
import {
  addChartEntryAction,
  deleteChartEntryAction,
} from '@/server/features/student-chart/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  studentUserId: string
  entries: StudentChartDto['entries']
  /** スレッドの画面から書くとき、そのスレッド（記録に付ける） */
  threadId?: string | null | undefined
  /** 出す件数（添削画面では最新の数件だけ） */
  limit?: number | undefined
}

/** レッスンの記録（日付つきで書き足していく短いメモ）。書く欄と一覧 */
export const ChartEntries = ({ studentUserId, entries, threadId = null, limit }: Props) => {
  const [state, action, pending] = useActionState(addChartEntryAction, IDLE_ACTION_STATE)
  const formRef = useRef<HTMLFormElement>(null)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.status === 'success') formRef.current?.reset()
  }
  const shown = limit === undefined ? entries : entries.slice(0, limit)

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="space-y-2">
        <input type="hidden" name="studentUserId" value={studentUserId} />
        {threadId && <input type="hidden" name="threadId" value={threadId} />}
        <textarea
          name="body"
          rows={2}
          maxLength={1000}
          required
          aria-label="レッスンの記録"
          placeholder="例：トップで右ひざが流れる。次回は後方から確認"
          className={inputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <FormMessage state={state} />
          <Button type="submit" size="sm" pending={pending} className="ml-auto">
            {pending ? '記録しています…' : '記録する'}
          </Button>
        </div>
      </form>
      {shown.length === 0 ? (
        <p className="text-caption text-muted">まだ記録はありません。</p>
      ) : (
        <ul className="divide-line-soft border-line-soft divide-y border-y">
          {shown.map((entry) => (
            <li key={entry.id} className="space-y-1 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-caption text-muted">
                  {formatDateTime(entry.createdAt)}
                  {entry.thread && (
                    <>
                      {'・'}
                      <Link href={`/coach/threads/${entry.thread.id}`} className="underline">
                        {entry.thread.theme || 'スレッド'}
                      </Link>
                    </>
                  )}
                </p>
                <DeleteEntryButton entryId={entry.id} />
              </div>
              <p className="text-body text-sm whitespace-pre-wrap">{entry.body}</p>
            </li>
          ))}
        </ul>
      )}
      {limit !== undefined && entries.length > limit && (
        <p className="text-caption text-muted">ほか {entries.length - limit} 件</p>
      )}
    </div>
  )
}

const DeleteEntryButton = ({ entryId }: { entryId: string }) => {
  const [, action, pending] = useActionState(deleteChartEntryAction, IDLE_ACTION_STATE)
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm('この記録を消しますか？')) event.preventDefault()
      }}
    >
      <input type="hidden" name="entryId" value={entryId} />
      <button
        type="submit"
        disabled={pending}
        className="text-caption text-muted hover:text-ink underline disabled:cursor-wait"
      >
        {pending ? '消しています…' : '消す'}
      </button>
    </form>
  )
}
