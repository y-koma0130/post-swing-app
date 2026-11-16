import type { ReactNode } from 'react'
import { formatDateTime } from '@/app/utils/format'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { buildTimeline, type TimelineItem } from '../utils/buildTimeline'

type Submission = ThreadDetailDto['submissions'][number]
type Message = ThreadDetailDto['messages'][number]
type Notice = ThreadDetailDto['notices'][number]

type Props = {
  submissions: ThreadDetailDto['submissions']
  messages: ThreadDetailDto['messages']
  notices: ThreadDetailDto['notices']
  /** 見ている人（自分の吹き出しを右に寄せる） */
  viewer: 'coach' | 'student'
  /** お知らせの文言（見る人で変わる） */
  noticeText: (notice: ThreadDetailDto['notices'][number]) => string
  /** 提出の中身（動画など）。画面ごとに描き方が違う */
  renderSubmission: (submission: Submission, index: number) => ReactNode
  /** 添削の中身（カードなど） */
  renderReply: (submission: Submission, index: number) => ReactNode
}

/**
 * スレッドの時系列。提出・添削・チャット・お知らせを1本に並べる。
 * 提出と添削の中身は呼び出し側が描く（動画や添削カードは別の feature の部品なので）
 */
export const ThreadTimeline = ({
  submissions,
  messages,
  notices,
  viewer,
  noticeText,
  renderSubmission,
  renderReply,
}: Props) => {
  const renderItem = (item: TimelineItem<Submission, Message, Notice>): ReactNode => {
    switch (item.kind) {
      case 'submission':
        return renderSubmission(item.submission, item.index)
      case 'reply':
        return renderReply(item.submission, item.index)
      case 'notice':
        return (
          <p className="bg-line-soft text-caption text-muted inline-block rounded-full px-3 py-1">
            {noticeText(item.notice)}
          </p>
        )
      case 'message':
        return <MessageBubble message={item.message} mine={item.message.from === viewer} />
    }
  }

  return (
    <ol className="space-y-4">
      {buildTimeline({ submissions, messages, notices }).map((item) => (
        <li
          key={item.key}
          className={
            item.kind === 'notice'
              ? 'text-center'
              : item.kind === 'message'
                ? `flex ${item.message.from === viewer ? 'justify-end' : 'justify-start'}`
                : undefined
          }
        >
          {renderItem(item)}
        </li>
      ))}
    </ol>
  )
}

const MessageBubble = ({ message, mine }: { message: Message; mine: boolean }) => (
  <div
    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
      mine ? 'bg-mint-soft text-ink' : 'bg-line-soft text-body'
    }`}
  >
    <p className="whitespace-pre-wrap">{message.body}</p>
    <p className="text-muted mt-1 text-[10px]">{formatDateTime(message.sentAt)}</p>
  </div>
)
