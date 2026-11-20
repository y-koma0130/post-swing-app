'use client'

import { type ReactNode, useState } from 'react'
import { textButtonClass } from '@/app/components/ui/Button'
import { LIST_PAGE_SIZE } from '@/app/utils/listPaging'

type Props = {
  /** 並べるもの（1つが1行。key はこちらで付ける） */
  items: ReadonlyArray<Readonly<{ key: string; node: ReactNode }>>
  /** はじめに出す数。「もっと見る」でも同じ数ずつ足す（はじめは LIST_PAGE_SIZE） */
  pageSize?: number | undefined
  className?: string | undefined
}

/**
 * 長くなる一覧（送ったドリルなど、全部読んでも軽いもの）。はじめは pageSize 件だけ出し、「もっと見る」で足していく。
 * 増え続けて重くなるもの（終わったレッスン）は、サーバーで件数を決めて読む（listPaging）
 */
export const ShowMoreList = ({ items, pageSize = LIST_PAGE_SIZE, className = '' }: Props) => {
  const [shown, setShown] = useState(pageSize)
  const rest = items.length - shown
  return (
    <div className="space-y-3">
      <ul className={className}>
        {items.slice(0, shown).map((item) => (
          <li key={item.key}>{item.node}</li>
        ))}
      </ul>
      {rest > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + pageSize)}
          className={textButtonClass()}
        >
          もっと見る（あと{rest}件）
        </button>
      )}
    </div>
  )
}
