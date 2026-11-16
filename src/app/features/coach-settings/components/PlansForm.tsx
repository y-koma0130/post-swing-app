'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import type { CoachSettingsDto } from '@/server/features/coach/application/dto/CoachSettings.dto'
import { updatePlansAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  plans: CoachSettingsDto['plans']
}

/** プラン3種の価格・説明・受付の有無。種類ごとに `<kind>.price` のような名前で送る */
export const PlansForm = ({ plans }: Props) => {
  const [state, action, pending] = useActionState(updatePlansAction, IDLE_ACTION_STATE)

  return (
    <form action={action} className="space-y-6">
      {plans.map((plan) => (
        <fieldset key={plan.kind} className="border-line-soft space-y-3 rounded-xl border p-4">
          <legend className="px-1 font-bold">{plan.name}</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name={`${plan.kind}.active`}
              defaultChecked={plan.active}
              className="accent-mint size-4"
            />
            受付ページに出す
          </label>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <label className="block space-y-1">
              <span className={labelTextClass}>表示名</span>
              <input
                name={`${plan.kind}.name`}
                defaultValue={plan.name}
                required
                className={inputClass}
              />
            </label>
            <label className="block space-y-1">
              <span className={labelTextClass}>
                価格（円{plan.kind === 'monthly' ? '／月' : ''}）
              </span>
              <input
                name={`${plan.kind}.price`}
                type="number"
                min={50}
                step={1}
                defaultValue={plan.priceYen}
                required
                className={inputClass}
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className={labelTextClass}>説明</span>
            <input
              name={`${plan.kind}.description`}
              defaultValue={plan.description}
              className={inputClass}
            />
          </label>
        </fieldset>
      ))}
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        プランを保存
      </Button>
    </form>
  )
}
