'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import type { CoachSettingsDto } from '@/server/features/coach/application/dto/CoachSettings.dto'
import { updateCoachProfileAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  settings: CoachSettingsDto
  /** 受付ページの URL の見本に使う（https://swingpost.app など） */
  siteUrl: string
}

export const CoachProfileForm = ({ settings, siteUrl }: Props) => {
  const [state, action, pending] = useActionState(updateCoachProfileAction, IDLE_ACTION_STATE)
  const [slug, setSlug] = useState(settings.slug)

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
          <span className="text-muted shrink-0 text-sm">/c/</span>
          <input
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.currentTarget.value)}
            pattern="[a-z0-9-]{3,30}"
            placeholder="yamada-golf"
            className={inputClass}
          />
        </div>
        <span className="text-caption text-muted block">
          生徒に案内する受付ページのURLの最後の部分です。インスタのプロフィールなどに貼って使います。
          英小文字・数字・ハイフンの3〜30文字（例：yamada-golf）。空欄にして保存すると、ランダムな文字列になります。
        </span>
        {slug && (
          <span className="text-caption text-body block break-all">
            {siteUrl}/c/{slug}
          </span>
        )}
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
      <Button type="submit" pending={pending}>
        プロフィールを保存
      </Button>
    </form>
  )
}
