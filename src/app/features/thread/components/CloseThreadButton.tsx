'use client'

import { useActionState, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { closeThreadAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  threadId: string
  coachName: string
}

/** 生徒が自分でスレッドを終える（確認してから。終えたらレビューを書ける） */
export const CloseThreadButton = ({ threadId, coachName }: Props) => {
  const [state, action, pending] = useActionState(closeThreadAction, IDLE_ACTION_STATE)
  const [confirming, setConfirming] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action={action} className="space-y-1 text-right">
      <input type="hidden" name="threadId" value={threadId} />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className="text-caption text-muted hover:text-ink underline"
      >
        このスレッドを終える
      </button>
      <FormMessage state={state} />
      <ConfirmDialog
        open={confirming}
        message={`${coachName}さんとのスレッドを終えますか？終えると、動画の提出とチャットはできなくなります（期限前でも返金はありません）。終えたあとにレビューを書けます。`}
        confirmLabel="終える"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          formRef.current?.requestSubmit()
        }}
      />
    </form>
  )
}
