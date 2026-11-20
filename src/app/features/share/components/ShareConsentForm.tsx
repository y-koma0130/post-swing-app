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
  /** モニターで申し込んだコーチか（公開をやめられない。出す項目は変えられる） */
  locked: boolean
}

/** マイページで、コーチごとの公開の許可を変える */
export const ShareConsentForm = ({ coachSlug, coachName, consent, canPublish, locked }: Props) => {
  const [state, action, pending] = useActionState(
    changeShareConsentAction.bind(null, coachSlug),
    IDLE_ACTION_STATE
  )
  return (
    <form action={action} className="space-y-3">
      {/*
        保存のあと、React はフォームを最初の値に戻す（form の reset）。チェックボックスが画面を開いたときの
        値に戻らないよう、保存した許可が変わったら作り直して、保存した値を最初の値にする
      */}
      <ShareConsentFields
        key={consent?.updatedAt.getTime() ?? 'none'}
        coachName={coachName}
        canPublish={canPublish}
        required={false}
        locked={locked}
        current={consent}
      />
      <FormMessage state={state} />
      <Button type="submit" variant="secondary" pending={pending}>
        {pending ? '保存しています…' : '保存する'}
      </Button>
    </form>
  )
}
