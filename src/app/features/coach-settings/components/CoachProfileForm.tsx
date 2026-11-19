'use client'

import { type FormEvent, useActionState, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { COACH_LICENSE_LABEL, COACH_LICENSES } from '@/app/utils/licenseText'
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
  const [confirmingSlug, setConfirmingSlug] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  /** 確認ダイアログで「変える」を押したあとの送信（もう一度は聞かない） */
  const slugConfirmed = useRef(false)

  // URL を変えると今の URL が使えなくなるので、保存の前に確かめる
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (slugConfirmed.current) {
      slugConfirmed.current = false
      return
    }
    if (slug.trim() !== settings.slug) {
      event.preventDefault()
      setConfirmingSlug(true)
    }
  }

  const newSlugText = slug.trim() === '' ? '（ランダムな文字列）' : slug.trim()

  return (
    <form ref={formRef} action={action} onSubmit={onSubmit} className="space-y-4">
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
      <fieldset className="space-y-2">
        <legend className={labelTextClass}>資格（あてはまるものをすべて）</legend>
        <div className="flex flex-wrap gap-2">
          {COACH_LICENSES.map((license) => (
            <label
              key={license}
              className="has-checked:border-mint has-checked:bg-mint-soft has-checked:text-ink border-line text-body has-focus-visible:ring-mint flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-focus-visible:ring-2"
            >
              <input
                type="checkbox"
                name="licenses"
                value={license}
                defaultChecked={settings.licenses.includes(license)}
                className="accent-mint"
              />
              {COACH_LICENSE_LABEL[license]}
            </label>
          ))}
        </div>
        <label className="block space-y-1">
          <span className="text-caption text-muted">その他の資格（選択肢にないもの）</span>
          <input
            name="licenseOther"
            defaultValue={settings.licenseOther}
            maxLength={50}
            placeholder="例：JLPGA ティーチングプロ A級"
            className={inputClass}
          />
        </label>
        <span className="text-caption text-muted block">受付ページに表示します。</span>
      </fieldset>
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
        {slug.trim() !== settings.slug && (
          <span className="text-caption text-body block break-all">
            保存すると {siteUrl}/c/{newSlugText} になります
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
      <ConfirmDialog
        open={confirmingSlug}
        message={`受付ページのURLが ${siteUrl}/c/${settings.slug} から ${siteUrl}/c/${newSlugText} に変わります。今のURLは使えなくなり、インスタなどに貼ったリンクや、キャンセル待ちの生徒に届いたお知らせのリンクからは、生徒が受付ページを開けなくなります。保存したら、貼ってあるリンクも新しいURLに変えてください（いまやりとり中の生徒には影響ありません）。`}
        confirmLabel="URLを変えて保存"
        onCancel={() => setConfirmingSlug(false)}
        onConfirm={() => {
          setConfirmingSlug(false)
          slugConfirmed.current = true
          formRef.current?.requestSubmit()
        }}
      />
    </form>
  )
}
