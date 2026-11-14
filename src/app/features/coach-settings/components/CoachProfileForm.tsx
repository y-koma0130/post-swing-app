'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import type { CoachSettingsDto } from '@/server/features/coach/application/dto/CoachSettings.dto'
import { updateCoachProfileAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  settings: CoachSettingsDto
}

export const CoachProfileForm = ({ settings }: Props) => {
  const [state, action, pending] = useActionState(updateCoachProfileAction, IDLE_ACTION_STATE)

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className={labelTextClass}>名前</span>
        <input name="name" defaultValue={settings.name} required className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>肩書</span>
        <input
          name="title"
          defaultValue={settings.title}
          placeholder="ティーチングプロ"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>紹介文</span>
        <textarea name="bio" defaultValue={settings.bio} rows={5} className={inputClass} />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>インスタグラム</span>
        <input
          name="instagram"
          defaultValue={settings.instagram}
          placeholder="@your_account"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>受付ページのURL</span>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-gray-500">/c/</span>
          <input
            name="slug"
            defaultValue={settings.slug}
            required
            pattern="[a-z0-9-]{3,30}"
            className={inputClass}
          />
        </div>
        <span className="text-xs text-gray-500">英小文字・数字・ハイフンの3〜30文字</span>
      </label>
      <label className="block space-y-1">
        <span className={labelTextClass}>月の受付枠（人）</span>
        <input
          name="monthlyCapacity"
          type="number"
          min={1}
          max={100}
          defaultValue={settings.monthlyCapacity}
          required
          className={`${inputClass} max-w-32`}
        />
      </label>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        プロフィールを保存
      </Button>
    </form>
  )
}
