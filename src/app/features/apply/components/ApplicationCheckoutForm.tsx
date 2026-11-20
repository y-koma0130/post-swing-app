'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inlineLinkClass } from '@/app/components/ui/linkStyles'
import { useLeavingPage } from '@/app/hooks/useLeavingPage'
import { PRIVACY_POLICY_URL } from '@/app/utils/externalLinks'
import { startApplicationCheckoutAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  threadId: string
  /** 開発中だけ：Stripe を通さずに申し込むリンク */
  devAuthorizeHref: string | null
  /** 無料のモニター（カードを登録せずに申し込む） */
  free: boolean
}

/** 悩みと動画を送った申し込みの、カードの登録（仮押さえ）へ進む。無料のモニターは、そのまま申し込む */
export const ApplicationCheckoutForm = ({ threadId, devAuthorizeHref, free }: Props) => {
  const label = free ? '申し込む' : 'カードを登録して申し込む'
  const [state, action, pending] = useActionState(startApplicationCheckoutAction, IDLE_ACTION_STATE)
  // 無料のときは同じサイトの中で移るだけなので、移動中の表示は要らない
  const { leaving, markLeaving } = useLeavingPage(state)
  const busy = pending || leaving
  return (
    <form action={action} onSubmit={free ? undefined : markLeaving} className="space-y-2">
      <input type="hidden" name="threadId" value={threadId} />
      <FormMessage state={state} />
      <p className="text-caption text-muted">
        「{label}」を押すと、
        <Link href="/legal/terms" className={inlineLinkClass}>
          利用規約
        </Link>
        と
        <a href={PRIVACY_POLICY_URL} className={inlineLinkClass}>
          プライバシーポリシー
        </a>
        （送った動画やお名前などを担当のコーチに提供することを含みます）に同意したものとします。
      </p>
      <Button type="submit" size="lg" className="w-full" pending={busy}>
        {busy ? (free ? '申し込んでいます…' : 'Stripe に移動しています…') : label}
      </Button>
      <p className="text-caption text-muted text-center">
        {free
          ? 'モニターなので無料です。カードの登録はいりません'
          : 'いまは請求されません。コーチが受け付けたときに請求されます'}
      </p>
      {devAuthorizeHref && !free && (
        <a
          href={devAuthorizeHref}
          className={`text-caption text-muted block text-center ${inlineLinkClass}`}
        >
          （開発用）Stripe を通さずに申し込む
        </a>
      )}
    </form>
  )
}
