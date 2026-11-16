'use client'

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'

type Props = {
  open: boolean
  message: string
  /** チェックボックスを出すときの文言（例：この不在期間中は次から表示しない） */
  checkboxLabel?: string | undefined
  confirmLabel?: string
  cancelLabel?: string
  /** 「送る」。チェックボックスを出したときは、その値を受け取る */
  onConfirm: (checked: boolean) => void
  /** 「やめる」・Esc・背景を押したとき */
  onCancel: () => void
}

/**
 * 送る前の確認ダイアログ
 *
 * - role="dialog"・aria-modal で読み上げに伝え、開いたら「送る」にフォーカスする
 * - Esc は「やめる」と同じ。Tab はダイアログの中だけを回る
 * - 「やめる」で閉じても、呼び出し側の入力は消さない
 */
export const ConfirmDialog = ({
  open,
  message,
  checkboxLabel,
  confirmLabel = '送る',
  cancelLabel = 'やめる',
  onConfirm,
  onCancel,
}: Props) => {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!open) return
    setChecked(false)
    const previous = document.activeElement
    confirmRef.current?.focus()
    return () => {
      // 閉じたら、開く前にフォーカスしていた場所（送るボタンなど）へ戻す
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open])

  if (!open) return null

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button, input')
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      {/* 背景を押したら「やめる」 */}
      <button
        type="button"
        aria-label={cancelLabel}
        tabIndex={-1}
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow-lg"
      >
        <p id={titleId} className="text-sm leading-relaxed">
          {message}
        </p>
        {checkboxLabel && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.currentTarget.checked)}
              className="accent-mint"
            />
            {checkboxLabel}
          </label>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-gray-200 px-4 py-3 text-sm font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => onConfirm(checked)}
            className="bg-mint text-ink flex-1 rounded-full px-4 py-3 text-sm font-semibold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
