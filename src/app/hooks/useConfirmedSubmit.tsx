'use client'

import { type FormEvent, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'

type Options = {
  message: string
  confirmLabel: string
  /** 取り消せない操作（削除・返金など） */
  danger?: boolean | undefined
}

/**
 * フォームを送る前に、アプリの確認ダイアログを出す（ブラウザ標準の confirm は使わない）。
 * form の onSubmit に渡し、返ってくる dialog をフォームの中か近くに置く
 */
export const useConfirmedSubmit = ({ message, confirmLabel, danger }: Options) => {
  const [open, setOpen] = useState(false)
  const form = useRef<HTMLFormElement | null>(null)
  /** 確認で「はい」を押したあとの送信（もう一度は聞かない） */
  const confirmed = useRef(false)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (confirmed.current) {
      confirmed.current = false
      return
    }
    event.preventDefault()
    form.current = event.currentTarget
    setOpen(true)
  }

  const dialog = (
    <ConfirmDialog
      open={open}
      message={message}
      confirmLabel={confirmLabel}
      danger={danger}
      onCancel={() => setOpen(false)}
      onConfirm={() => {
        setOpen(false)
        confirmed.current = true
        form.current?.requestSubmit()
      }}
    />
  )

  return { onSubmit, dialog }
}
