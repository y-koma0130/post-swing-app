'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'
import type { QuoteKind } from '@/server/features/thread/domain/values/ChatMessage'

/** 入力欄で引用しているもの（見出しは画面に出すだけ。送るのは種類と ID） */
export type QuoteTarget = { kind: QuoteKind; targetId: string; label: string }

/** 入力欄の id（「引用する」を押したら、ここへ移る） */
export const CHAT_INPUT_ID = 'chat-composer-body'

type QuoteState = {
  quote: QuoteTarget | null
  setQuote: (quote: QuoteTarget | null) => void
}

const QuoteContext = createContext<QuoteState>({ quote: null, setQuote: () => undefined })

/** 時系列の「引用する」と入力欄をつなぐ。スレッドの画面全体を包む */
export const QuoteProvider = ({ children }: { children: ReactNode }) => {
  const [quote, setQuote] = useState<QuoteTarget | null>(null)
  return <QuoteContext value={{ quote, setQuote }}>{children}</QuoteContext>
}

export const useQuote = () => useContext(QuoteContext)

/**
 * 「引用する」ボタン。押すと入力欄に引用を置き、入力欄へ移る。
 * PC ではホバーで出し、タッチの端末では常に出す（親に group を付ける）
 */
export const QuoteButton = ({ target }: { target: QuoteTarget }) => {
  const { setQuote } = useQuote()
  return (
    <button
      type="button"
      onClick={() => {
        setQuote(target)
        const input = document.getElementById(CHAT_INPUT_ID)
        input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        input?.focus({ preventScroll: true })
      }}
      className="text-caption text-muted hover:text-ink shrink-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0"
      aria-label={`${target.label}を引用する`}
    >
      ↩︎ 引用
    </button>
  )
}
