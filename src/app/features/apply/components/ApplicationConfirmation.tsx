import Link from 'next/link'
import { inlineLinkClass } from '@/app/components/ui/linkStyles'
import { formatYen } from '@/app/utils/format'
import type { PlanKind } from '@/server/features/coach/domain/values/Plan'
import { APPLICATION_RULES, THREAD_RULES } from '@/server/features/thread/domain/rules'

const PLAN_LABEL = { trial: 'お試し', single: '1レッスン', monthly: '月額プラン' } as const

type Props = {
  coachName: string
  planKind: PlanKind
  priceYen: number
  systemFeeYen: number
  maxSubmissions: number
  /** モニターのプロモーションコードでの申し込み（0円なら無料） */
  monitor: boolean
}

/**
 * 申し込みの最終確認（特定商取引法 12条の6）。カードの登録（Stripe）へ進むボタンの直前に出す。
 * 分量・金額・支払いの時期と方法・提供の時期・申し込みの取り消しと解約を、ここだけで読めるようにする
 */
export const ApplicationConfirmation = ({
  coachName,
  planKind,
  priceYen,
  systemFeeYen,
  maxSubmissions,
  monitor,
}: Props) => {
  const monthly = planKind === 'monthly'
  const free = priceYen === 0
  const perMonth = monthly ? '／月' : ''
  const rows: ReadonlyArray<readonly [string, string]> = [
    ['プラン', `${coachName}さんの${PLAN_LABEL[planKind]}${monitor ? '（モニター）' : ''}`],
    [
      'お支払い金額',
      free
        ? '無料（モニター）'
        : `${formatYen(priceYen + systemFeeYen)}${perMonth}（税込。価格 ${formatYen(priceYen)}＋システム利用料 ${formatYen(systemFeeYen)}）`,
    ],
    ...(monitor
      ? [
          [
            'モニターの条件',
            '添削の内容を、コーチが SNS で紹介することがあります（選んだ範囲で。名前は出しません）。あとから公開をやめることはできません（顔をぼかすか、年代・平均スコアを出すかは、マイページで変えられます）',
          ] as const,
        ]
      : []),
    [
      '内容',
      `1レッスン${THREAD_RULES.durationDays}日間、動画の提出${maxSubmissions}回まで（コーチの不在期間があるときは、その日数だけ延びます）`,
    ],
    ...(monthly
      ? [
          [
            '契約期間',
            '解約するまで毎月自動で更新し、そのたびに新しい1レッスンが始まります。マイページからいつでも解約でき、次の更新日から請求されません',
          ] as const,
        ]
      : []),
    [
      'お支払い方法・時期',
      free
        ? 'お支払いはありません（カードの登録もいりません）'
        : `クレジットカード（Stripe）。いまはカードの利用枠を確保するだけで、コーチが受け付けた時点で請求します${monthly ? '。2か月目からは毎月の更新日に請求します' : ''}`,
    ],
    [
      '開始の時期',
      `コーチが受け付けた時点で添削が始まります。${APPLICATION_RULES.approvalHours}時間以内に受け付けられなかったときは取り消され、請求されません`,
    ],
    [
      'キャンセル・返金',
      free
        ? '無料のため、お支払い・返金はありません'
        : `コーチがお受けできなかったときは請求されません。受け付けたあとは、原則として返金しません${monthly ? '（すでに始まった月の分も同じです）' : ''}`,
    ],
  ]
  return (
    <section className="border-line space-y-3 rounded-xl border p-4">
      <h3 className="text-sm font-bold">申し込みの内容（最終確認）</h3>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted text-caption">{label}</dt>
            <dd className="text-body">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-caption text-muted">
        くわしくは
        <Link href="/legal/terms" className={inlineLinkClass}>
          利用規約
        </Link>
        と
        <Link href="/legal/commerce" className={inlineLinkClass}>
          特定商取引法に基づく表記
        </Link>
        をご覧ください。
      </p>
    </section>
  )
}
