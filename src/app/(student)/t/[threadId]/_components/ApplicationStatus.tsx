import Link from 'next/link'
import { plainLinkClass } from '@/app/components/ui/linkStyles'
import { Notice } from '@/app/components/ui/Notice'
import { ApplicationCheckoutForm } from '@/app/features/apply/components/ApplicationCheckoutForm'
import { ApplicationConfirmation } from '@/app/features/apply/components/ApplicationConfirmation'
import { formatDateTime } from '@/app/utils/format'
import { DECLINE_REASON_LABEL } from '@/app/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'

type Props = {
  thread: Pick<
    ThreadDetailDto,
    | 'id'
    | 'status'
    | 'coachName'
    | 'coachSlug'
    | 'planKind'
    | 'application'
    | 'submissions'
    | 'limits'
  >
  /** カードの登録から戻ってきたところ */
  justApplied: boolean
}

const STEPS = [
  '悩みと動画を送る',
  'カードを登録する（まだ請求されません）',
  'コーチが内容を見て、受け付けたら請求',
] as const

/** 無料のモニターの手順（カードを使わない） */
const FREE_STEPS = [
  '悩みと動画を送る',
  '申し込む（カードの登録はいりません）',
  'コーチが内容を見て、受け付けたら添削が始まる',
] as const

/**
 * 申し込み（承認制）のあいだの案内。下書き・承認待ち・お断りで出し分ける。
 * レッスンが始まったら何も出さない
 */
export const ApplicationStatus = ({ thread, justApplied }: Props) => {
  if (thread.status === 'draft') {
    const step = thread.submissions.length === 0 ? 0 : 1
    const free = thread.application.free
    return (
      <Notice title="申し込みの手順" className="space-y-4">
        <ol className="space-y-2">
          {(free ? FREE_STEPS : STEPS).map((label, i) => (
            <li
              key={label}
              className={`flex items-center gap-3 text-sm ${i === step ? 'text-ink font-bold' : 'text-muted'}`}
            >
              <span
                className={`text-caption flex size-6 shrink-0 items-center justify-center rounded-full ${
                  i < step
                    ? 'bg-mint text-ink'
                    : i === step
                      ? 'border-mint border-2'
                      : 'border-line border'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        {step === 1 && thread.application.checkout && (
          <ApplicationConfirmation
            coachName={thread.coachName}
            planKind={thread.planKind}
            priceYen={thread.application.checkout.priceYen}
            systemFeeYen={thread.application.checkout.systemFeeYen}
            maxSubmissions={thread.limits.maxSubmissions}
            monitor={thread.application.monitor}
          />
        )}
        {step === 1 && (
          <ApplicationCheckoutForm
            threadId={thread.id}
            devAuthorizeHref={import.meta.env.DEV ? `/api/dev/purchase?thread=${thread.id}` : null}
            free={free}
          />
        )}
      </Notice>
    )
  }
  if (thread.status === 'requested') {
    const deadline = thread.application.approvalDeadline
    return (
      <Notice
        tone="mint"
        status
        title={`${justApplied ? '申し込みました。' : ''}${thread.coachName}さんが内容を確認しています`}
      >
        <p>
          {deadline ? `${formatDateTime(deadline)}までに` : ''}
          {thread.application.free
            ? 'お返事します。受け付けられたら、添削が始まります。'
            : 'お返事します。受け付けられたときに請求され、添削が始まります（まだ請求されていません）。'}
        </p>
      </Notice>
    )
  }
  if (thread.status === 'declined') {
    const decline = thread.application.decline
    return (
      <Notice title="今回の申し込みはお受けできませんでした">
        {decline && <p>{DECLINE_REASON_LABEL[decline.reason]}</p>}
        {decline?.message && (
          <p className="border-line text-body border-l-2 pl-3 whitespace-pre-wrap">
            {thread.coachName}さんより：{decline.message}
          </p>
        )}
        {!thread.application.free && (
          <p className="text-muted">カードの仮押さえは取り消しました。請求はされていません。</p>
        )}
        <Link
          href={`/c/${thread.coachSlug}`}
          className={`text-mint-text inline-block font-bold ${plainLinkClass}`}
        >
          {thread.coachName}さんのページへ
        </Link>
      </Notice>
    )
  }
  return null
}
