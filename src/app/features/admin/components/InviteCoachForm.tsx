'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { inviteCoachAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

export const InviteCoachForm = () => {
  const [state, action, pending] = useActionState(inviteCoachAction, IDLE_ACTION_STATE)

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <label className="block space-y-1">
        <span className={labelTextClass}>メールアドレス</span>
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>名前</span>
        <input name="name" required className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>受付ページのURL（任意）</span>
        <input
          name="slug"
          pattern="[a-z0-9-]{3,30}"
          placeholder="yamada-golf"
          className={inputClass}
        />
        <span className="block text-xs text-gray-500">
          /c/ のあとに付く文字。空欄なら自動で決まり、コーチがあとで変えられます
        </span>
      </label>
      <div className="space-y-2 sm:col-span-3">
        <FormMessage state={state} />
        <Button type="submit" disabled={pending}>
          招待する
        </Button>
      </div>
    </form>
  )
}
