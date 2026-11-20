'use client'

import { useActionState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { CopyButton } from '@/app/components/ui/CopyButton'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { useConfirmedSubmit } from '@/app/hooks/useConfirmedSubmit'
import { formatDateTime } from '@/app/utils/format'
import {
  createDemoCoachAction,
  deleteDemoCoachAction,
  reissueDemoLinkAction,
} from '@/server/features/demo/presentation/actions'
import type { DemoActionState } from '@/server/features/demo/presentation/demoActionState'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coaches: ReadonlyArray<{ userId: string; name: string; expiresAt: Date }>
}

/** 作った・作り直したときは、デモ用のリンクとコピーのボタンを出す。それ以外は FormMessage */
const DemoResult = ({ state }: { state: DemoActionState }) =>
  state.status === 'link' ? (
    <div className="bg-mint-soft space-y-2 rounded-xl p-3">
      <p className="text-sm">{state.message}</p>
      <div className="flex items-center gap-2">
        <span className="text-caption min-w-0 flex-1 font-mono break-all">{state.url}</span>
        <CopyButton text={state.url} label="デモ用のリンクをコピー" />
      </div>
    </div>
  ) : (
    <FormMessage state={state} />
  )

/**
 * 管理画面のデモ（staging だけ）。コーチ候補ごとにデモのコーチを作り、デモ用のリンクを渡す。
 * デモは7日で、データごと消える
 */
export const DemoCoachesCard = ({ coaches }: Props) => {
  const [state, action, pending] = useActionState<DemoActionState, FormData>(
    createDemoCoachAction,
    IDLE_ACTION_STATE
  )
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-heading">デモ（staging だけ）</h2>
        <p className="text-muted text-sm">
          コーチ候補に操作を試してもらうためのコーチを作ります。架空の生徒・ドリル・いろいろな状態のレッスンが入っていて、添削も試せます。通知は送らず、Stripe
          も使いません。7日たつと、データごと消えます。
        </p>
      </div>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block min-w-48 flex-1 space-y-1">
          <span className={labelTextClass}>コーチ候補の名前</span>
          <input name="name" required maxLength={30} className={inputClass} />
        </label>
        <Button type="submit" pending={pending}>
          デモを作る
        </Button>
      </form>
      <DemoResult state={state} />
      {coaches.length > 0 && (
        <ul className="divide-line-soft border-line-soft divide-y border-y">
          {coaches.map((coach) => (
            <DemoCoachRow key={coach.userId} coach={coach} />
          ))}
        </ul>
      )}
    </Card>
  )
}

const DemoCoachRow = ({ coach }: { coach: Props['coaches'][number] }) => {
  const [linkState, reissue, reissuing] = useActionState<DemoActionState, FormData>(
    reissueDemoLinkAction,
    IDLE_ACTION_STATE
  )
  const [deleteState, remove, removing] = useActionState<DemoActionState, FormData>(
    deleteDemoCoachAction,
    IDLE_ACTION_STATE
  )
  const confirm = useConfirmedSubmit({
    message: `${coach.name}さんのデモを消しますか？\nデータごと消え、デモ用のリンクも使えなくなります。`,
    confirmLabel: '消す',
    danger: true,
  })
  return (
    <li className="space-y-2 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{coach.name}</p>
          <p className="text-caption text-muted">{formatDateTime(coach.expiresAt)}に消えます</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form action={reissue}>
            <input type="hidden" name="coachUserId" value={coach.userId} />
            <Button type="submit" variant="secondary" size="sm" pending={reissuing}>
              リンクを作り直す
            </Button>
          </form>
          <form action={remove} onSubmit={confirm.onSubmit}>
            {confirm.dialog}
            <input type="hidden" name="coachUserId" value={coach.userId} />
            <Button type="submit" variant="danger" size="sm" pending={removing}>
              消す
            </Button>
          </form>
        </div>
      </div>
      <DemoResult state={linkState} />
      <DemoResult state={deleteState} />
    </li>
  )
}
