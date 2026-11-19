'use client'

import { useActionState, useState } from 'react'
import { TurnstileWidget } from '@/app/components/TurnstileWidget'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { Notice } from '@/app/components/ui/Notice'
import { formatYen } from '@/app/utils/format'
import { SYSTEM_FEE_NOTE, systemFeeFor } from '@/app/utils/systemFeeText'
import type { ApplyPageDto } from '@/server/features/purchase/application/dto/ApplyPage.dto'
import { startApplicationAction } from '@/server/features/purchase/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Props = {
  coachSlug: string
  plans: ApplyPageDto['coach']['plans']
  student: ApplyPageDto['student']
  /** ボット対策（Turnstile）のサイトキー */
  turnstileSiteKey: string
  /** コーチが不在・返信遅れのとき、了承チェックの文言。了承が要らなければ null */
  delayAckLabel: string | null
  /** 使えるプロモコードを入れたとき、モニターの1レッスン。なければ null（ふだんのプランを出す） */
  monitor?: Readonly<{ code: string; priceYen: number }> | null | undefined
}

/** プランを選んで申し込む（悩みと動画を送る画面へ。請求はコーチが受け付けたとき） */
export const PlanCheckoutForm = ({
  coachSlug,
  plans,
  student,
  turnstileSiteKey,
  delayAckLabel,
  monitor = null,
}: Props) => {
  const [state, action, pending] = useActionState(startApplicationAction, IDLE_ACTION_STATE)
  const [acknowledged, setAcknowledged] = useState(false)
  const needsAck = student !== null && delayAckLabel !== null

  const unavailableReason = (kind: Props['plans'][number]['kind']): string | null => {
    if (kind === 'trial' && student?.trialUsed) return '利用済み'
    if (kind === 'monthly' && student?.subscribed) return '申し込み済み'
    return null
  }
  const single = plans.find((plan) => plan.kind === 'single')
  // モニターは1レッスンだけ（コーチが1レッスンを止めていても申し込める）
  const shownPlans = monitor
    ? [
        {
          kind: 'single' as const,
          name: `${single?.name ?? '1レッスン'}（モニター）`,
          priceYen: monitor.priceYen,
          description: single?.description ?? '',
        },
      ]
    : plans
  const firstAvailable = shownPlans.find((plan) => unavailableReason(plan.kind) === null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="coachSlug" value={coachSlug} />
      {monitor && <input type="hidden" name="monitorCode" value={monitor.code} />}
      <fieldset className="space-y-3">
        <legend className="sr-only">プラン</legend>
        {shownPlans.map((plan) => {
          const reason = unavailableReason(plan.kind)
          return (
            <label
              key={plan.kind}
              className={`rounded-card has-checked:border-mint has-checked:bg-mint-soft border-line flex cursor-pointer items-start gap-3 border p-4 ${
                reason ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <input
                type="radio"
                name="planKind"
                value={plan.kind}
                disabled={reason !== null}
                defaultChecked={plan.kind === firstAvailable?.kind}
                className="accent-mint mt-1"
              />
              <span className="flex-1">
                <span className="flex items-baseline justify-between">
                  <span className="font-bold">{plan.name}</span>
                  <span className="font-bold">
                    {plan.priceYen === 0 ? '無料' : formatYen(plan.priceYen)}
                    {plan.kind === 'monthly' && <span className="text-sm font-normal">/月</span>}
                  </span>
                </span>
                <span className="text-muted mt-1 block text-sm">{reason ?? plan.description}</span>
                <span className="text-caption text-muted mt-1 block">
                  {plan.priceYen === 0 ? (
                    'システム利用料もかかりません。カードの登録は不要です'
                  ) : (
                    <>
                      ＋システム利用料{formatYen(systemFeeFor(plan.priceYen))}
                      {plan.kind === 'monthly' ? '／月' : ''}（お支払い{' '}
                      {formatYen(plan.priceYen + systemFeeFor(plan.priceYen))}
                      {plan.kind === 'monthly' ? '／月' : ''}）
                    </>
                  )}
                </span>
              </span>
            </label>
          )
        })}
      </fieldset>
      {/* ログインしていなければ、先にログインへ進むので要らない。送ったあとは作り直す（トークンは1回きり） */}
      {student && (
        <TurnstileWidget
          key={state.status === 'idle' ? 'idle' : state.message}
          siteKey={turnstileSiteKey}
          action="checkout"
        />
      )}
      {needsAck && (
        <label className="bg-warning-soft flex items-start gap-2 rounded-xl p-4 text-sm">
          <input
            type="checkbox"
            name="acknowledgeDelay"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.currentTarget.checked)}
            className="accent-mint mt-1"
          />
          {delayAckLabel}
        </label>
      )}
      {monitor && (
        <Notice tone="mint" title="モニターの条件">
          <p>
            添削の内容を、コーチが SNS
            で紹介することがあります。名前は出しません。顔を出すか、年代・スコアを出すかは、悩みと動画を送るときに選べます（18歳以上の方に限ります）。
          </p>
        </Notice>
      )}
      <FormMessage state={state} />
      <Button
        type="submit"
        pending={pending}
        disabled={!firstAvailable || (needsAck && !acknowledged)}
        size="lg"
        className="w-full"
      >
        {pending ? '準備しています…' : student ? '申し込みへ進む' : 'ログインして申し込む'}
      </Button>
      {monitor?.priceYen === 0 ? (
        <p className="text-caption text-muted">
          悩みと動画を送ると申し込めます。コーチが内容を見て受け付けたら、添削が始まります。
        </p>
      ) : (
        <p className="text-caption text-muted">
          悩みと動画を送ってカードを登録すると申し込めます。請求されるのは、コーチが内容を見て受け付けたときです（月額は、そこから毎月自動で請求されます）。
          {SYSTEM_FEE_NOTE}お支払いは Stripe の画面で行い、カード番号は SwingPost に保存されません。
        </p>
      )}
    </form>
  )
}
