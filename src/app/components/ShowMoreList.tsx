'use client'

import { type ReactNode, useState } from 'react'
import { textButtonClass } from '@/app/components/ui/Button'

type Props = {
  /** 並べるもの（1つが1行。key はこちらで付ける） */
  items: ReadonlyArray<Readonly<{ key: string; node: ReactNode }>>
  /** はじめに出す数。「もっと見る」でも同じ数ずつ足す */
  pageSize: number
  className?: string | undefined
}

/** 長くなる一覧（終わったレッスンなど）。はじめは pageSize 件だけ出し、「もっと見る」で足していく */
export const ShowMoreList = ({ items, pageSize, className = '' }: Props) => {
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
