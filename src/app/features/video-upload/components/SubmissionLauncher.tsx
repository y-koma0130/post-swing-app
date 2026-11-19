'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Drawer } from '@/app/components/ui/Drawer'
import { useBackgroundSubmission } from '../hooks/useBackgroundSubmission'
import { SubmissionForm } from './SubmissionForm'

type Props = Omit<Parameters<typeof SubmissionForm>[0], 'onStarted'> & {
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
  const [formKey, setFormKey] = useState(0)
  const count = `（${submissionCount}/${maxSubmissions}）`
  const label = `スイング動画を送る${count}`
  const background = useBackgroundSubmission()
  const mine = background.kind !== 'idle' && background.threadId === form.threadId
  const sending = mine && background.kind === 'running'
  const finished = mine && background.kind === 'done'

  // 提出が終わったら、次に開いたときは空のフォームにする（失敗したときは入力と動画を残す）
  useEffect(() => {
    if (finished) setFormKey((k) => k + 1)
  }, [finished])

  return (
    <>
      <Button
        variant={prominent ? 'primary' : 'secondary'}
        size={prominent ? 'lg' : 'sm'}
        className={prominent ? 'w-full' : ''}
        disabled={blockedReason !== null || sending}
        onClick={() => setOpen(true)}
      >
        {sending ? '動画を送っています…' : blockedReason ? `${blockedReason}${count}` : label}
      </Button>
      <Drawer open={open} title={label} onClose={() => setOpen(false)}>
        <SubmissionForm key={formKey} {...form} onStarted={() => setOpen(false)} />
      </Drawer>
    </>
  )
}
