'use client'

import { useActionState } from 'react'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { formatDateTime } from '@/app/utils/format'
import { setDelayFlagAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  active: boolean
  expiresAt: Date | null
}

/** 返信遅れの表示のオン・オフ。オンは7日で自動で外れる */
export const DelayFlagToggle = ({ active, expiresAt }: Props) => {
  const [state, action, pending] = useActionState(setDelayFlagAction, IDLE_ACTION_STATE)

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="on" value={active ? 'false' : 'true'} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          role="switch"
          aria-checked={active}
          disabled={pending}
          className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${
            active ? 'bg-mint' : 'bg-gray-300'
          }`}
        >
          <span className="sr-only">返信が遅れる場合があることを表示する</span>
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              active ? 'left-6' : 'left-1'
            }`}
          />
        </button>
        <span className="text-sm">
          {active ? '「返信が遅れる場合があります」と表示中' : 'オフ'}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        {active && expiresAt
          ? `${formatDateTime(expiresAt)}に自動で解除されます`
          : 'オンにすると、7日後に自動で解除されます'}
      </p>
      <FormMessage state={state} />
    </form>
  )
}
