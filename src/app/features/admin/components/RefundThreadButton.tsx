'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { useConfirmedSubmit } from '@/app/hooks/useConfirmedSubmit'
import { formatYen } from '@/app/utils/format'
import { refundThreadAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  threadId: string
  studentName: string
  priceYen: number
}

/**
 * スレッドの支払いを全額返金する。コーチへ送った分も取り戻し、手数料も生徒へ返す。
 * 取り消せないので、金額と相手を出して確かめる
 */
export const RefundThreadButton = ({ threadId, studentName, priceYen }: Props) => {
  const [state, action, pending] = useActionState(refundThreadAction, IDLE_ACTION_STATE)
  const confirm = useConfirmedSubmit({
    message: `${studentName}さんに ${formatYen(priceYen)} を全額返金し、レッスンを終了します。\nコーチへ送った売上も取り戻します。取り消せません。よろしいですか？`,
    confirmLabel: '返金する',
    danger: true,
  })

  return (
    <form action={action} onSubmit={confirm.onSubmit} className="space-y-1">
      {confirm.dialog}
      <input type="hidden" name="threadId" value={threadId} />
      <Button type="submit" variant="danger" size="sm" pending={pending}>
        返金する
      </Button>
      <FormMessage state={state} />
    </form>
  )
}
