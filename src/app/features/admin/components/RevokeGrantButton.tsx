'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { revokeGrantAction } from '@/server/features/campaign/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  grantId: string
  coachName: string
  campaignName: string
}

/** コーチの特典を取り消す。取り消すとキャンペーンの枠が空く */
export const RevokeGrantButton = ({ grantId, coachName, campaignName }: Props) => {
  const [state, action, pending] = useActionState(revokeGrantAction, IDLE_ACTION_STATE)

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const message = `${coachName}さんの「${campaignName}」の特典を取り消しますか？\nこれからの請求は通常の手数料になります。取り消すとキャンペーンの枠が1つ空きます（元には戻せません）。`
        if (!window.confirm(message)) event.preventDefault()
      }}
      className="space-y-1"
    >
      <input type="hidden" name="grantId" value={grantId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        取り消す
      </Button>
      <FormMessage state={state} />
    </form>
  )
}
