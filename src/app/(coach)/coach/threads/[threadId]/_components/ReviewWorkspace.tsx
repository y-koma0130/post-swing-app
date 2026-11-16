'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { AnnotationLayer } from '@/app/features/annotation/components/AnnotationLayer'
import { AnnotationToolbar } from '@/app/features/annotation/components/AnnotationToolbar'
import { renderAnnotatedFrame } from '@/app/features/annotation/components/renderAnnotatedFrame'
import { useAnnotationEditor } from '@/app/features/annotation/hooks/useAnnotationEditor'
import { ChatPanel } from '@/app/features/chat/components/ChatPanel'
import { formatShortDate } from '@/app/features/coach-availability/utils/availabilityText'
import { CardDraftList } from '@/app/features/review-card/components/CardDraftList'
import {
  KEY_POSITION_LABEL,
  ReviewCardList,
} from '@/app/features/review-card/components/ReviewCardList'
import { useCardDrafts } from '@/app/features/review-card/hooks/useCardDrafts'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'

type Props = {
  threadId: string
  closed: boolean
  videos: ThreadDetailDto['videos']
  drills: DrillDto[]
}

const KEY_POSITIONS = ['address', 'top', 'impact', 'finish'] as const satisfies KeyPosition[]

/**
 * 添削画面の作業エリア
 * 動画を止めて線を引き、キー位置ごとにキャプチャしてカードにする。カードをまとめて1通で送る
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const ReviewWorkspace = ({ threadId, closed, videos, drills }: Props) => {
  const router = useRouter()
  const editor = useAnnotationEditor()
  const cards = useCardDrafts()
  const videoElement = useRef<HTMLVideoElement | null>(null)
  const [index, setIndex] = useState(videos.length - 1)
  const [comparing, setComparing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = videos[index]
  const previous = index > 0 ? videos[index - 1] : undefined

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoElement.current = video
  }, [])

  if (!current) {
    return (
      <p className="rounded-card bg-white p-6 text-sm text-gray-500 shadow-sm">
        まだ動画が届いていません。届いたらメールでお知らせします。
      </p>
    )
  }

  const select = (next: number) => {
    setIndex(next)
    // 別の動画に引いた線は持ち越さない
    editor.reset()
  }

  const capture = async (position: KeyPosition) => {
    const video = videoElement.current
    if (!video) return
    video.pause()
    setError(null)
    try {
      const image = await renderAnnotatedFrame(video, editor.annotations)
      cards.add({
        position,
        timeSec: video.currentTime,
        annotations: [...editor.annotations],
        image,
      })
      // 次のキー位置は、まっさらな状態から線を引く
      editor.reset()
    } catch {
      setError('キャプチャできませんでした。動画を読み込んでからもう一度お試しください')
    }
  }

  const send = async () => {
    if (cards.drafts.some((d) => d.comment.trim() === '')) {
      setError('すべてのカードに理由を書いてください')
      return
    }
    setSending(true)
    setError(null)
    const result = await cards.send(threadId, current.id)
    setSending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {videos.map((video, i) => (
            <button
              key={video.id}
              type="button"
              aria-pressed={i === index}
              onClick={() => select(i)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${
                i === index ? 'bg-ink text-white' : 'bg-white text-gray-700 shadow-sm'
              }`}
            >
              {i + 1}本目{video.reply ? '（返信済み）' : ''}
            </button>
          ))}
          {previous && (
            <label className="ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={comparing}
                onChange={(event) => setComparing(event.currentTarget.checked)}
                className="accent-mint size-4"
              />
              前回と並べる
            </label>
          )}
        </div>
        {!current.reply && <AnnotationToolbar editor={editor} />}
        <div className={comparing && previous ? 'grid gap-3 md:grid-cols-2' : ''}>
          <VideoPlayer
            key={current.url}
            src={current.url}
            frameRate={current.frameRate}
            onVideoElement={onVideoElement}
            renderOverlay={
              current.reply
                ? undefined
                : ({ width, height }) => (
                    <AnnotationLayer editor={editor} width={width} height={height} />
                  )
            }
          />
          {comparing && previous && (
            <VideoPlayer key={previous.url} src={previous.url} frameRate={previous.frameRate} />
          )}
        </div>
        {current.note && (
          <p className="rounded-card bg-white p-4 text-sm whitespace-pre-wrap text-gray-700 shadow-sm">
            {current.note}
          </p>
        )}
      </div>

      <aside className="space-y-4">
        {current.reply ? (
          <Card className="space-y-3">
            <h2 className="font-bold">送った添削</h2>
            <ReviewCardList cards={current.reply.cards} />
          </Card>
        ) : (
          <Card className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-bold">添削カード</h2>
              <p className="text-xs text-gray-500">
                動画を止めて線を引き、キー位置を押すと、そのコマがカードになります。
              </p>
              <div className="grid grid-cols-2 gap-2">
                {KEY_POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    disabled={closed}
                    onClick={() => capture(position)}
                    className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40"
                  >
                    {KEY_POSITION_LABEL[position]}
                  </button>
                ))}
              </div>
            </div>
            <CardDraftList
              drafts={cards.drafts}
              drills={drills}
              onChange={cards.update}
              onRemove={cards.remove}
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <Button
              onClick={send}
              disabled={sending || closed || cards.drafts.length === 0}
              className="w-full"
            >
              {cards.drafts.length === 0
                ? 'カードを作ってください'
                : `${cards.drafts.length}枚のカードを送る`}
            </Button>
          </Card>
        )}
        <Card className="space-y-3">
          <h2 className="font-bold">チャット</h2>
          <ChatPanel
            threadId={threadId}
            video={current}
            viewer="coach"
            closed={closed}
            notices={current.notices.map((n) => ({
              id: n.id,
              text: `不在中に送られました（${formatShortDate(n.absenceEndDate)}まで不在）`,
              createdAt: n.createdAt,
            }))}
          />
        </Card>
      </aside>
    </div>
  )
}
