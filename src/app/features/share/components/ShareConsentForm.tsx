'use client'

import { useActionState } from 'react'
import { ShareConsentFields } from '@/app/components/ShareConsentFields'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import type { ShareConsentDto } from '@/server/features/share/application/dto/ShareConsent.dto'
import { changeShareConsentAction } from '@/server/features/share/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coachSlug: string
  coachName: string
  consent: ShareConsentDto
  /** 18歳以上か（いちばん新しい申し込みのときの年代） */
  canPublish: boolean
}

/** マイページで、コーチごとの公開の許可を変える */
export const ShareConsentForm = ({ coachSlug, coachName, consent, canPublish }: Props) => {
  const [state, action, pending] = useActionState(
    changeShareConsentAction.bind(null, coachSlug),
    IDLE_ACTION_STATE
  )
  return (
    <form action={action} className="space-y-3">
      <ShareConsentFields
        coachName={coachName}
        canPublish={canPublish}
        required={false}
        current={consent}
      />
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" pending={pending}>
        {pending ? '保存しています…' : '保存する'}
      </Button>
    </form>
  )
}
