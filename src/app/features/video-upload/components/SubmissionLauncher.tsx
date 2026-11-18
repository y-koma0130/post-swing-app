'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Drawer } from '@/app/components/ui/Drawer'
import { SubmissionForm } from './SubmissionForm'

type Props = Omit<Parameters<typeof SubmissionForm>[0], 'onSubmitted'> & {
  /** 提出した回数と上限（ボタンの「（1/3）」） */
  submissionCount: number
  maxSubmissions: number
  /** いま提出できない理由（ボタンに出す短い言い方）。提出できるなら null */
  blockedReason: string | null
  /** 大きく出すか（まだ1回も提出していないとき） */
  prominent: boolean
}

/**
 * チャットの入力欄に置く「スイング動画を送る（1/3）」。押すとドロワーで提出フォームを開く
 */
export const SubmissionLauncher = ({
  submissionCount,
  maxSubmissions,
  blockedReason,
  prominent,
  ...form
}: Props) => {
  const [open, setOpen] = useState(false)
  // 提出したら、次に開いたときは空のフォームにする
  const [formKey, setFormKey] = useState(0)
  const count = `（${submissionCount}/${maxSubmissions}）`
  const label = `スイング動画を送る${count}`

  return (
    <>
      <Button
        variant={prominent ? 'primary' : 'secondary'}
        size={prominent ? 'lg' : 'sm'}
        className={prominent ? 'w-full' : ''}
        disabled={blockedReason !== null}
        onClick={() => setOpen(true)}
      >
        {blockedReason ? `${blockedReason}${count}` : label}
      </Button>
      <Drawer open={open} title={label} onClose={() => setOpen(false)}>
        <SubmissionForm
          key={formKey}
          {...form}
          onSubmitted={() => {
            setOpen(false)
            setFormKey((k) => k + 1)
          }}
        />
      </Drawer>
    </>
  )
}
