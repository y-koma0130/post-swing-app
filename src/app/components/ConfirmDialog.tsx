'use client'

import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/Button'

type Props = {
  open: boolean
  message: string
  /** チェックボックスを出すときの文言（例：この不在期間中は次から表示しない） */
  checkboxLabel?: string | undefined
  confirmLabel?: string
  cancelLabel?: string
  /** 取り消せない操作（削除・返金など）。確定のボタンを危険の見た目にする */
  danger?: boolean | undefined
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
  danger = false,
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
        className="rounded-card relative w-full max-w-sm space-y-4 bg-white p-6 shadow-lg"
      >
        <p id={titleId} className="text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
        {checkboxLabel && (
          <label className="text-body flex items-center gap-2 text-sm">
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
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={danger ? 'danger' : 'primary'}
            onClick={() => onConfirm(checked)}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
