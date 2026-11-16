'use client'

import { useActionState } from 'react'
import { FormMessage } from '@/app/components/ui/FormMessage'
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

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = `${studentName}さんに ${formatYen(priceYen)} を全額返金し、スレッドを終了します。\nコーチへ送った売上も取り戻します。取り消せません。よろしいですか？`
        if (!window.confirm(message)) event.preventDefault()
      }}
      className="space-y-1"
    >
      <input type="hidden" name="threadId" value={threadId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-red-200 px-3 py-1 text-xs text-red-700 disabled:opacity-40"
      >
        返金する
      </button>
      <FormMessage state={state} />
    </form>
  )
}
