'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { createDrillAction } from '@/server/features/drill/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

export const DrillForm = () => {
  const [state, action, pending] = useActionState(createDrillAction, IDLE_ACTION_STATE)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <label className="block space-y-1">
        <span className={labelTextClass}>名前</span>
        <input
          name="title"
          required
          maxLength={50}
          placeholder="例：右ひざキープの素振り"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>やり方</span>
        <textarea name="description" rows={4} maxLength={1000} className={inputClass} />
      </label>
      <FormMessage state={state} />
      <Button type="submit" pending={pending}>
        登録する
      </Button>
    </form>
  )
}
