'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import type { GrantableCampaignDto } from '@/server/features/campaign/application/dto/CoachFeeGrantSummary.dto'
import { inviteCoachAction } from '@/server/features/coach/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  /** 付けられるキャンペーンと残りの枠 */
  campaigns: GrantableCampaignDto[]
}

export const InviteCoachForm = ({ campaigns }: Props) => {
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
        <span className="text-caption text-muted block">
          /c/ のあとに付く文字。空欄なら自動で決まり、コーチがあとで変えられます
        </span>
      </label>
      {campaigns.length > 0 && (
        <label className="block space-y-1 sm:col-span-3">
          <span className={labelTextClass}>キャンペーン（任意）</span>
          <select name="campaignCode" defaultValue="" className={inputClass}>
            <option value="">付けない</option>
            {campaigns.map((campaign) => (
              <option key={campaign.code} value={campaign.code} disabled={campaign.remaining === 0}>
                {campaign.name}
                {campaign.remaining === null ? '' : `（残り${campaign.remaining}名）`}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="space-y-2 sm:col-span-3">
        <FormMessage state={state} />
        <Button type="submit" pending={pending}>
          招待する
        </Button>
      </div>
    </form>
  )
}
