'use client'

import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /**
   * sheet：スマホは下から全画面、PC は右から細めに（入力フォーム）
   * wide：PC は右から画面の7割、タブレット・スマホは全画面（添削の作業）
   */
  size?: 'sheet' | 'wide' | undefined
}

/**
 * 画面の横（スマホは下）から出す作業スペース
 *
 * - 閉じても中身は消さない（送信中の動画や書きかけのカードを残す）。閉じているあいだは inert にする
 * - body の直下に出す（フォームの中から開いても、フォームが入れ子にならないように）。
 *   サーバーでは描かず、ブラウザで表示してから出す
 * - role="dialog"・aria-modal、開いたら中にフォーカスし、Esc で閉じる
 */
export const Drawer = ({ open, title, onClose, children, size = 'sheet' }: Props) => {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    panelRef.current?.focus()
    // 後ろの画面がスクロールしないようにする
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  const width = size === 'wide' ? 'lg:w-[70vw]' : 'sm:w-[28rem]'

  if (!mounted) return null

  return createPortal(
    <div className={`fixed inset-0 z-40 ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      {/* 背景を押したら閉じる */}
      <button
        type="button"
        aria-label="閉じる"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/40 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`bg-surface absolute inset-x-0 bottom-0 flex h-[100dvh] flex-col shadow-xl transition-transform outline-none sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full ${width} ${
          open
            ? 'translate-y-0 sm:translate-x-0'
            : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
      >
        <header className="border-line-soft flex items-center justify-between gap-3 border-b bg-white px-5 py-3">
          <h2 id={titleId} className="text-heading">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink rounded-full px-2 text-xl leading-none"
            aria-label="閉じる"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
