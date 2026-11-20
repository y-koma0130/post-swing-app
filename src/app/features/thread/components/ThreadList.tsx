import { Badge, type BadgeTone } from '@/app/components/ui/Badge'
import { CardLink } from '@/app/components/ui/CardLink'
import { formatDateTime, formatMonthDay } from '@/app/utils/format'
import { RETAKE_OPEN_LABEL, THREAD_STATUS_LABEL } from '@/app/utils/threadText'
import type { ThreadSummaryDto } from '@/server/features/thread/application/dto/ThreadSummary.dto'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import { replyDueText } from '../utils/lessonGroups'

/** 見ている人が動く番なら目立たせる（コーチは承認と返信、生徒は申し込みの続きと自分の番） */
const STATUS_TONE = {
  coach: {
    draft: 'neutral',
    requested: 'mint',
    waiting_coach: 'mint',
    waiting_student: 'neutral',
    closed: 'neutral',
    declined: 'neutral',
  },
  student: {
    draft: 'warning',
    requested: 'neutral',
    waiting_coach: 'neutral',
    waiting_student: 'mint',
    closed: 'neutral',
    declined: 'neutral',
  },
} as const satisfies Record<'coach' | 'student', Record<ThreadStatus, BadgeTone>>

const DUE_TONE = {
  overdue: 'danger',
  soon: 'warning',
  normal: 'mint',
} as const satisfies Record<ReturnType<typeof replyDueText>['urgency'], BadgeTone>

type Viewer = 'coach' | 'student'

/** 状態の札。撮り直しを待っているあいだは、その言い方にする（生徒は動く番なので目立たせる） */
const statusBadge = (t: ThreadSummaryDto, viewer: Viewer): { label: string; tone: BadgeTone } =>
  t.retakeOpen
    ? { label: RETAKE_OPEN_LABEL[viewer], tone: viewer === 'student' ? 'warning' : 'neutral' }
    : { label: THREAD_STATUS_LABEL[viewer][t.status], tone: STATUS_TONE[viewer][t.status] }

/** 一覧の右下の一行（申し込みのあいだは、期限や回数の代わりに次にすること） */
const statusNote = (t: ThreadSummaryDto): string => {
  switch (t.status) {
    case 'draft':
      return t.free
        ? '悩みと動画を送ると申し込めます'
        : '悩みと動画を送り、カードを登録すると申し込めます'
    case 'requested':
      return t.approvalDeadline ? `返事の期限 ${formatDateTime(t.approvalDeadline)}` : '確認中'
    case 'declined':
      return t.free ? 'お受けできませんでした' : '請求はされていません'
    default:
      return `提出 ${t.submissionCount}/${t.maxSubmissions}回・期限 ${formatMonthDay(t.expiresAt)}`
  }
}

/** テーマ（まだ書いていなければ、その状態の言い方） */
const themeText = (t: ThreadSummaryDto): string =>
  t.theme === ''
    ? t.status === 'draft'
      ? '（悩みと動画をまだ送っていません）'
      : '（まだ動画が届いていません）'
    : t.theme

type Props = {
  threads: ThreadSummaryDto[]
  /** 見ている人。リンク先と状態の言い方が変わる */
  viewer: Viewer
  /** いまの時刻（コーチの添削の返事の目安を「あと何時間」で出す） */
  now: Date
  /** 相手の名前を出すか（コーチ詳細ページのように相手が決まっているときは出さず、テーマを見出しにする） */
  showCounterpart?: boolean | undefined
}

/** 進行中のレッスンの一覧（カード） */
export const ThreadList = ({ threads, viewer, now, showCounterpart = true }: Props) => (
  <ul className="space-y-3">
    {threads.map((t) => {
      const badge = statusBadge(t, viewer)
      const due = viewer === 'coach' && t.replyDueAt ? replyDueText(t.replyDueAt, now) : null
      return (
        <li key={t.id}>
          <CardLink href={viewer === 'coach' ? `/coach/threads/${t.id}` : `/t/${t.id}`}>
            {/* 1行目：相手（またはテーマ）と状態、2行目：テーマ、3行目：期限・回数などの一言 */}
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 flex-1 truncate font-bold">
                {showCounterpart ? t.counterpartName || '（名前なし）' : themeText(t)}
              </p>
              <span className="flex shrink-0 flex-wrap justify-end gap-1">
                {t.unread && <Badge tone="warning">未読</Badge>}
                {due ? (
                  <Badge tone={DUE_TONE[due.urgency]}>添削 {due.text}</Badge>
                ) : (
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                )}
              </span>
            </div>
            {showCounterpart && (
              <p className="text-muted mt-0.5 truncate text-sm">{themeText(t)}</p>
            )}
            <p className="text-caption text-muted mt-1">{statusNote(t)}</p>
          </CardLink>
        </li>
      )
    })}
  </ul>
)
