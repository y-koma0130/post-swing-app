'use client'

import { useActionState, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Badge, type BadgeTone } from '@/app/components/ui/Badge'
import { Button, textButtonClass } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { CopyButton } from '@/app/components/ui/CopyButton'
import { DisclosureToggle, summaryClass } from '@/app/components/ui/DisclosureToggle'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { formatYen } from '@/app/utils/format'
import { THREAD_STATUS_LABEL } from '@/app/utils/threadText'
import type { MonitorCodeDto } from '@/server/features/monitor/application/dto/MonitorCode.dto'
import { MONITOR_RULES } from '@/server/features/monitor/domain/rules'
import { saveMonitorCodeAction } from '@/server/features/monitor/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import {
  MONITOR_CODE_STATE_LABEL,
  type MonitorCodeState,
  monitorApplyUrl,
  monitorCodeState,
  monitorPriceText,
} from '../utils/monitorText'

type Props = {
  codes: ReadonlyArray<MonitorCodeDto>
  /** 1レッスンの通常価格（1レッスンのプランがなければ null） */
  singlePriceYen: number | null
  siteUrl: string
  coachSlug: string
}

const STATE_TONE = {
  open: 'mint',
  stopped: 'neutral',
  full: 'neutral',
  expired: 'neutral',
} as const satisfies Record<MonitorCodeState, BadgeTone>

/**
 * モニター募集のプロモコード（設定画面）。コードを入れた人だけが、1レッスンをモニター価格で申し込める。
 * 無料は知人に、割引はフォロワーに、のようにコードを分けて使える
 */
export const MonitorCodesCard = ({ codes, singlePriceYen, siteUrl, coachSlug }: Props) => {
  const now = new Date()
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-heading">モニター募集（プロモコード）</h2>
        <p className="text-muted text-sm">
          コードを入れた人だけが、1レッスンをモニター価格で申し込めます。モニターは、添削の公開を許可することが条件です。月の受付枠にも数えます。
        </p>
      </div>
      {singlePriceYen === null ? (
        <p className="text-muted text-sm">1レッスンのプランがないので、コードを作れません。</p>
      ) : (
        <>
          {codes.map((code) => (
            <MonitorCodeItem
              key={code.id}
              code={code}
              state={monitorCodeState(code, now)}
              applyUrl={monitorApplyUrl(siteUrl, coachSlug, code.code)}
              singlePriceYen={singlePriceYen}
            />
          ))}
          <details className="group" open={codes.length === 0}>
            <summary className={summaryClass}>
              <span className="text-sm font-bold">新しいコードを作る</span>
              <DisclosureToggle closedLabel="作る" />
            </summary>
            <div className="mt-3">
              <MonitorCodeForm code={null} singlePriceYen={singlePriceYen} />
            </div>
          </details>
        </>
      )}
    </Card>
  )
}

const MonitorCodeItem = ({
  code,
  state,
  applyUrl,
  singlePriceYen,
}: {
  code: MonitorCodeDto
  state: MonitorCodeState
  applyUrl: string
  singlePriceYen: number
}) => (
  <section className="border-line space-y-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-bold">{code.label}</h3>
      <Badge tone={STATE_TONE[state]}>{MONITOR_CODE_STATE_LABEL[state]}</Badge>
    </div>
    <div className="bg-mint-soft flex items-center gap-2 rounded-xl py-2 pr-2 pl-4">
      <span className="text-ink flex-1 font-mono text-lg font-bold tracking-widest">
        {code.code}
      </span>
      <CopyButton text={code.code} label="コードをコピー" />
    </div>
    <div className="flex items-center gap-2">
      <span className="text-caption text-muted min-w-0 flex-1 break-all">{applyUrl}</span>
      <CopyButton text={applyUrl} label="コード入りの申し込みリンクをコピー" />
    </div>
    <dl className="text-caption text-muted flex flex-wrap gap-x-4 gap-y-1">
      <div className="flex">
        <dt>価格：</dt>
        <dd className="text-body">{monitorPriceText(code.priceYen)}</dd>
      </div>
      <div className="flex">
        <dt>申し込み：</dt>
        <dd className="text-body">
          {code.usedCount} / {code.maxUses}人
        </dd>
      </div>
      <div className="flex">
        <dt>期限：</dt>
        <dd className="text-body">{code.expiresOn ?? 'なし'}</dd>
      </div>
    </dl>
    {code.monitors.length > 0 && (
      <ul className="text-caption space-y-1">
        {code.monitors.map((monitor, i) => (
          // 同じ生徒が2回入ることはない（モニターは1回まで）が、名前は重なりうるので位置も使う
          // biome-ignore lint/suspicious/noArrayIndexKey: 並びは申し込んだ順で変わらない
          <li key={`${monitor.threadId ?? 'none'}-${i}`} className="flex justify-between gap-2">
            <span className="text-body">{monitor.studentName || '（名前なし）'}</span>
            <span className="text-muted">
              {monitor.threadStatus
                ? THREAD_STATUS_LABEL.coach[monitor.threadStatus]
                : '申し込み途中'}
            </span>
          </li>
        ))}
      </ul>
    )}
    <details className="group">
      <summary className={summaryClass}>
        <span className="text-sm">内容を変える・止める</span>
        <DisclosureToggle closedLabel="開く" />
      </summary>
      <div className="mt-3">
        <MonitorCodeForm code={code} singlePriceYen={singlePriceYen} />
      </div>
    </details>
  </section>
)

/** コードを作る・変える（作り直す・止める・再開するも、このフォームから） */
const MonitorCodeForm = ({
  code,
  singlePriceYen,
}: {
  code: MonitorCodeDto | null
  singlePriceYen: number
}) => {
  const [state, action, pending] = useActionState(saveMonitorCodeAction, IDLE_ACTION_STATE)
  const formRef = useRef<HTMLFormElement>(null)
  const regenerateRef = useRef<HTMLButtonElement>(null)
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {code && <input type="hidden" name="codeId" value={code.id} />}
      {code?.active && <input type="hidden" name="active" value="on" />}
      <label className="block space-y-1">
        <span className={labelTextClass}>呼び名（生徒には見えません）</span>
        <input
          name="label"
          required
          maxLength={MONITOR_RULES.labelMaxLength}
          defaultValue={code?.label ?? ''}
          placeholder="例：知人用、インスタ募集"
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={labelTextClass}>モニター価格（円）</span>
          <input
            name="priceYen"
            type="number"
            inputMode="numeric"
            required
            min={0}
            max={singlePriceYen - 1}
            step={1}
            defaultValue={code?.priceYen ?? 0}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className={labelTextClass}>先着の人数</span>
          <input
            name="maxUses"
            type="number"
            inputMode="numeric"
            required
            min={1}
            max={MONITOR_RULES.maxUsesPerCode}
            step={1}
            defaultValue={code?.maxUses ?? 3}
            className={inputClass}
          />
        </label>
      </div>
      <p className="text-caption text-muted">
        0円で無料（カードの登録なし）。有料なら{MONITOR_RULES.minPaidPriceYen}円以上で、1レッスン（
        {formatYen(singlePriceYen)}
        ）より安くしてください。割引の場合は、生徒にシステム利用料がかかります。
      </p>
      <label className="block space-y-1">
        <span className={labelTextClass}>期限（任意。この日まで使えます）</span>
        <input
          name="expiresOn"
          type="date"
          defaultValue={code?.expiresOn ?? ''}
          className={inputClass}
        />
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="intent" value="save" pending={pending}>
          {code ? '保存する' : 'コードを作る'}
        </Button>
        {code && (
          <>
            <button
              type="submit"
              name="intent"
              value="toggle"
              disabled={pending}
              className={textButtonClass()}
            >
              {code.active ? '募集を止める' : '募集を再開する'}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingRegenerate(true)}
              className={textButtonClass()}
            >
              コードを作り直す
            </button>
            <button
              ref={regenerateRef}
              type="submit"
              name="intent"
              value="regenerate"
              hidden
              tabIndex={-1}
            />
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmingRegenerate}
        message="コードを作り直しますか？いまのコード（共有したリンクも）は使えなくなります。すでに申し込んだ人はそのままです。"
        confirmLabel="作り直す"
        onCancel={() => setConfirmingRegenerate(false)}
        onConfirm={() => {
          setConfirmingRegenerate(false)
          formRef.current?.requestSubmit(regenerateRef.current)
        }}
      />
    </form>
  )
}
