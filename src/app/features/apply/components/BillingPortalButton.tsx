'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { useLeavingPage } from '@/app/hooks/useLeavingPage'
import { openBillingPortalAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

/** 月額の解約・カードの変更（Stripe の画面へ移る） */
export const BillingPortalButton = ({ purchaseId }: { purchaseId: string }) => {
  const [state, action, pending] = useActionState(openBillingPortalAction, IDLE_ACTION_STATE)
  const { leaving, markLeaving } = useLeavingPage(state)
  const busy = pending || leaving
  return (
    <form action={action} onSubmit={markLeaving} className="space-y-1">
      <input type="hidden" name="purchaseId" value={purchaseId} />
      <Button type="submit" variant="secondary" size="sm" pending={busy}>
        {busy ? 'Stripe に移動しています…' : '解約・カードの変更'}
      </Button>
      <FormMessage state={state} />
    </form>
  )
}
