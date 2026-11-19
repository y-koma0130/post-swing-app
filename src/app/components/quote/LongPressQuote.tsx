'use client'

import { type PointerEvent, type ReactNode, useRef } from 'react'
import { CHAT_INPUT_ID, type QuoteTarget, useQuote } from './QuoteContext'

/** これだけ押し続けたら引用する（ミリ秒） */
const HOLD_MS = 500
/** 指がこれ以上動いたら、スクロールとみなして取りやめる（ピクセル） */
const MOVE_TOLERANCE = 10

type Props = {
  target: QuoteTarget
  children: ReactNode
  className?: string | undefined
}

/**
 * 長押しで引用する（生徒の画面用。ボタンを並べずにすっきりさせる）
 *
 * - 指・マウスで 0.5 秒押し続けると、入力欄に引用を置いて入力欄へ移る
 * - 右クリック（スマホの長押しメニューも）でも引用する
 * - 長押ししたあとの「押した」扱い（動画を開くなど）は取りやめる
 */
export const LongPressQuote = ({ target, children, className }: Props) => {
  const { setQuote } = useQuote()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }

  const quote = () => {
    fired.current = true
    setQuote(target)
    navigator.vibrate?.(10)
    const input = document.getElementById(CHAT_INPUT_ID)
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    input?.focus({ preventScroll: true })
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    fired.current = false
    start.current = { x: event.clientX, y: event.clientY }
    timer.current = setTimeout(() => {
      timer.current = null
      quote()
    }, HOLD_MS)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const s = start.current
    if (s && Math.hypot(event.clientX - s.x, event.clientY - s.y) > MOVE_TOLERANCE) cancel()
  }

  return (
    // 長押しは補助の操作（ボタンを使わない人にも、入力欄からいつでも書ける）
    // biome-ignore lint/a11y/noStaticElementInteractions: 長押しで引用するための入れ物
    <div
      className={`select-none [-webkit-touch-callout:none] ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(event) => {
        event.preventDefault()
        cancel()
        quote()
      }}
      onClickCapture={(event) => {
        // 長押しのあとに離したときの click は、動画を開くなどに使わせない
        if (fired.current) {
          event.preventDefault()
          event.stopPropagation()
          fired.current = false
        }
      }}
    >
      {children}
    </div>
  )
}
