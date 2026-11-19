import { Fragment, type ReactNode } from 'react'
import { DrillDetails } from '@/app/components/DrillDetails'
import { LongPressQuote } from '@/app/components/quote/LongPressQuote'
import { QuoteButton } from '@/app/components/quote/QuoteContext'
import { QuotePreview } from '@/app/components/quote/QuotePreview'
import { formatDateTime } from '@/app/utils/format'
import { quoteAnchorId } from '@/app/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { buildTimeline, firstNewItemKey, type TimelineItem } from '../utils/buildTimeline'
import { TIMELINE_END_ID, TIMELINE_NEW_ID } from './ScrollToLatest'

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
  /** 見ている人が最後に開いた時刻（開く前の値）。そのあとの相手の出来事の手前に「ここから新着」を出す */
  lastReadAt?: Date | null | undefined
  /** 引用の操作：button は「↩︎ 引用」ボタン（コーチ）、longPress は長押し（生徒） */
  quoteMode?: 'button' | 'longPress' | undefined
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
  lastReadAt = null,
  quoteMode = 'button',
}: Props) => {
  const items = buildTimeline({ submissions, messages, notices })
  const newKey = firstNewItemKey(items, {
    lastReadAt,
    counterpart: viewer === 'coach' ? 'student' : 'coach',
  })
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
            quoteMode={quoteMode}
          />
        )
    }
  }

  return (
    <>
      <ol className="space-y-4">
        {items.map((item) => (
          <Fragment key={item.key}>
            {item.key === newKey && (
              <li
                id={TIMELINE_NEW_ID}
                className="flex scroll-mt-24 items-center gap-3"
                aria-label="ここから新着"
              >
                <span className="bg-mint h-px flex-1" />
                <span className="text-caption text-mint-text font-bold">ここから新着</span>
                <span className="bg-mint h-px flex-1" />
              </li>
            )}
            <li
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
          </Fragment>
        ))}
      </ol>
      <div id={TIMELINE_END_ID} />
    </>
  )
}

const MessageBubble = ({
  message,
  mine,
  renderVideo,
  quoteMode,
}: {
  message: Message
  mine: boolean
  renderVideo: (video: MessageVideo) => ReactNode
  quoteMode: 'button' | 'longPress'
}) => {
  const { attachment } = message
  const excerpt =
    message.body.trim() !== ''
      ? message.body.trim().slice(0, 40)
      : attachment.kind === 'drill'
        ? `ドリル：${attachment.title}`
        : '動画'
  const target = {
    kind: 'message' as const,
    targetId: message.id,
    label: `${message.from === 'coach' ? 'コーチ' : '生徒'}：${excerpt}`,
  }
  const bubble = (
    <div
      id={quoteAnchorId('message', message.id)}
      className={`group w-full scroll-mt-20 space-y-2 rounded-2xl px-4 py-2 text-sm ${
        mine ? 'bg-mint-soft text-ink' : 'bg-line-soft text-body'
      }`}
    >
      {message.quote && <QuotePreview quote={message.quote} />}
      {attachment.kind === 'drill' && (
        <DrillDetails
          title={attachment.title}
          description={attachment.description}
          videoUrl={attachment.videoUrl}
        />
      )}
      {attachment.kind === 'video' && (
        <div id={quoteAnchorId('video', attachment.videoId)} className="scroll-mt-20">
          {renderVideo(attachment)}
        </div>
      )}
      {message.body && <p className="whitespace-pre-wrap">{message.body}</p>}
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-muted">{formatDateTime(message.sentAt)}</p>
        {quoteMode === 'button' && <QuoteButton target={target} />}
      </div>
    </div>
  )
  return quoteMode === 'longPress' ? (
    <LongPressQuote target={target} className="w-full max-w-[85%]">
      {bubble}
    </LongPressQuote>
  ) : (
    <div className="w-full max-w-[85%]">{bubble}</div>
  )
}
