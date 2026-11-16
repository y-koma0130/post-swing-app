import type { ReactNode } from 'react'
import { QuoteButton } from '@/app/features/chat/components/QuoteContext'
import { formatDateTime } from '@/app/utils/format'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { buildTimeline, type TimelineItem } from '../utils/buildTimeline'
import { quoteAnchorId } from '../utils/threadText'
import { QuotePreview } from './QuotePreview'

type Submission = ThreadDetailDto['submissions'][number]
type Message = ThreadDetailDto['messages'][number]
type Notice = ThreadDetailDto['notices'][number]
type MessageVideo = Extract<Message['attachment'], { kind: 'video' }>

type Props = {
  submissions: ThreadDetailDto['submissions']
  messages: ThreadDetailDto['messages']
  notices: ThreadDetailDto['notices']
  /** 見ている人（自分の吹き出しを右に寄せる） */
  viewer: 'coach' | 'student'
  /** お知らせの文言（見る人で変わる） */
  noticeText: (notice: Notice) => string
  /** 提出の中身（動画など）。画面ごとに描き方が違う */
  renderSubmission: (submission: Submission, index: number) => ReactNode
  /** 添削の中身（カードなど） */
  renderReply: (submission: Submission, index: number) => ReactNode
  /** コーチがチャットで送った動画（再生の部品は別の feature なので、呼び出し側が描く） */
  renderMessageVideo: (video: MessageVideo) => ReactNode
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
  renderMessageVideo,
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
        return (
          <MessageBubble
            message={item.message}
            mine={item.message.from === viewer}
            renderVideo={renderMessageVideo}
          />
        )
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

const MessageBubble = ({
  message,
  mine,
  renderVideo,
}: {
  message: Message
  mine: boolean
  renderVideo: (video: MessageVideo) => ReactNode
}) => {
  const { attachment } = message
  const excerpt =
    message.body.trim() !== ''
      ? message.body.trim().slice(0, 40)
      : attachment.kind === 'drill'
        ? `ドリル：${attachment.title}`
        : '動画'
  return (
    <div
      id={quoteAnchorId('message', message.id)}
      className={`group w-full max-w-[85%] scroll-mt-20 space-y-2 rounded-2xl px-4 py-2 text-sm ${
        mine ? 'bg-mint-soft text-ink' : 'bg-line-soft text-body'
      }`}
    >
      {message.quote && <QuotePreview quote={message.quote} />}
      {attachment.kind === 'drill' && (
        <div className="rounded-xl bg-white p-3">
          <p className="text-ink text-caption font-bold">ドリル：{attachment.title}</p>
          {attachment.description && (
            <p className="text-caption text-body mt-1 whitespace-pre-wrap">
              {attachment.description}
            </p>
          )}
        </div>
      )}
      {attachment.kind === 'video' && (
        <div id={quoteAnchorId('video', attachment.videoId)} className="scroll-mt-20">
          {renderVideo(attachment)}
        </div>
      )}
      {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted text-[10px]">{formatDateTime(message.sentAt)}</p>
        <QuoteButton
          target={{
            kind: 'message',
            targetId: message.id,
            label: `${message.from === 'coach' ? 'コーチ' : '生徒'}：${excerpt}`,
          }}
        />
      </div>
    </div>
  )
}
