'use client'

import { useFormStatus } from 'react-dom'
import { textButtonClass } from '@/app/components/ui/Button'
import { useConfirmedSubmit } from '@/app/hooks/useConfirmedSubmit'
import { deleteDrillAction } from '@/server/features/drill/presentation/actions'

/** ドリルを消す（確認してから。消しているあいだは押せなくして、文言を変える） */
export const DeleteDrillButton = ({ drillId, title }: { drillId: string; title: string }) => {
  const confirm = useConfirmedSubmit({
    message: `「${title}」を消しますか？これまでに送った添削やチャットのドリルは、生徒の画面に残ります。`,
    confirmLabel: '消す',
    danger: true,
  })
  return (
    <form action={deleteDrillAction} onSubmit={confirm.onSubmit}>
      {confirm.dialog}
      <input type="hidden" name="drillId" value={drillId} />
      <SubmitLabel />
    </form>
  )
}

const SubmitLabel = () => {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={textButtonClass({ danger: true })}
    >
      {pending ? '消しています…' : '消す'}
    </button>
  )
}
