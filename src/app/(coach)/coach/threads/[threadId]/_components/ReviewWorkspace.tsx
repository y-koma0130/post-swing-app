'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { AnnotationLayer } from '@/app/features/annotation/components/AnnotationLayer'
import { AnnotationToolbar } from '@/app/features/annotation/components/AnnotationToolbar'
import { renderAnnotatedFrame } from '@/app/features/annotation/components/renderAnnotatedFrame'
import { useAnnotationEditor } from '@/app/features/annotation/hooks/useAnnotationEditor'
import { QuoteButton } from '@/app/features/chat/components/QuoteContext'
import { CardDraftList } from '@/app/features/review-card/components/CardDraftList'
import { ReviewView } from '@/app/features/review-card/components/ReviewView'
import { useCardDrafts } from '@/app/features/review-card/hooks/useCardDrafts'
import {
  ANGLE_LABEL,
  KEY_POSITION_LABEL,
  ordinalLabel,
} from '@/app/features/thread/utils/threadText'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'

type Props = {
  threadId: string
  closed: boolean
  submissions: ThreadDetailDto['submissions']
  /** 開いている提出（ドロワーを開いた提出）。中のタブで切り替えられる */
  index: number
  onIndexChange: (index: number) => void
  /** 開いている動画（提出の中の何本目か） */
  videoIndex: number
  onVideoIndexChange: (index: number) => void
  drills: DrillDto[]
  /** 添削を送れたとき（ドロワーを閉じる） */
  onSent: () => void
}

const KEY_POSITIONS = ['address', 'top', 'impact', 'finish'] as const satisfies KeyPosition[]

const tabClass = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm font-bold ${
    active ? 'bg-ink text-white' : 'text-body bg-white shadow-sm'
  }`

/**
 * 添削の作業エリア（ドロワーの中に開く）
 * 動画（正面・後方など）を切り替えながら、止めて線を引き、キー位置ごとにキャプチャして画像にする。
 * 画像（それぞれに一言）・全体の説明・おすすめのドリルを、提出ごとにまとめて1通で送る。
 * 添削済みの提出は、動画と送った添削を見るだけ
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const ReviewWorkspace = ({
  threadId,
  closed,
  submissions,
  index,
  onIndexChange,
  videoIndex,
  onVideoIndexChange,
  drills,
  onSent,
}: Props) => {
  const router = useRouter()
  const editor = useAnnotationEditor()
  const cards = useCardDrafts()
  const videoElement = useRef<HTMLVideoElement | null>(null)
  const [comparing, setComparing] = useState(false)
  const [sending, setSending] = useState(false)
  /** 添削全体の説明と、おすすめのドリル（閉じても書きかけを残す） */
  const [comment, setComment] = useState('')
  const [drillIds, setDrillIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const current = submissions[index]
  const currentVideo = current?.videos[videoIndex] ?? current?.videos[0]
  const previousSubmission = index > 0 ? submissions[index - 1] : undefined
  // 前回の同じ角度の動画と並べる（なければ前回の1本目）
  const previousVideo =
    previousSubmission?.videos.find((v) => v.angle === currentVideo?.angle) ??
    previousSubmission?.videos[0]

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoElement.current = video
  }, [])

  if (!current || !currentVideo) {
    return (
      <p className="rounded-card text-muted bg-white p-6 text-sm shadow-sm">
        まだ動画が届いていません。届いたらメールでお知らせします。
      </p>
    )
  }

  const angleOf = (videoId: string): string | null => {
    const video = current.videos.find((v) => v.id === videoId)
    return video && current.videos.length > 1 ? ANGLE_LABEL[video.angle] : null
  }

  const selectSubmission = (next: number) => {
    onIndexChange(next)
    onVideoIndexChange(0)
    // 別の動画に引いた線は持ち越さない
    editor.reset()
  }

  const selectVideo = (next: number) => {
    onVideoIndexChange(next)
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
        videoId: currentVideo.id,
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
    if (comment.trim() === '') {
      setError('説明を書いてください')
      return
    }
    setSending(true)
    setError(null)
    const result = await cards.send(threadId, current.id, { comment, drillIds })
    setSending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setComment('')
    setDrillIds([])
    onSent()
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {submissions.map((submission, i) => (
            <button
              key={submission.id}
              type="button"
              aria-pressed={i === index}
              onClick={() => selectSubmission(i)}
              className={tabClass(i === index)}
            >
              {ordinalLabel(i)}
              {submission.reply ? '（添削済み）' : ''}
            </button>
          ))}
          {previousVideo && (
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
        {current.videos.length > 1 && (
          <div className="flex gap-2" role="tablist" aria-label="動画の角度">
            {current.videos.map((video, i) => (
              <button
                key={video.id}
                type="button"
                role="tab"
                aria-selected={video.id === currentVideo.id}
                onClick={() => selectVideo(i)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  video.id === currentVideo.id
                    ? 'border-mint bg-mint-soft text-ink font-bold'
                    : 'border-line text-muted bg-white'
                }`}
              >
                {ANGLE_LABEL[video.angle]}
                {cards.drafts.some((d) => d.videoId === video.id) &&
                  `（${cards.drafts.filter((d) => d.videoId === video.id).length}枚）`}
              </button>
            ))}
          </div>
        )}
        {!current.reply && <AnnotationToolbar editor={editor} />}
        <div className={comparing && previousVideo ? 'grid gap-3 md:grid-cols-2' : ''}>
          <VideoPlayer
            key={currentVideo.url}
            src={currentVideo.url}
            frameRate={currentVideo.frameRate}
            onVideoElement={onVideoElement}
            renderOverlay={
              current.reply
                ? undefined
                : ({ width, height }) => (
                    <AnnotationLayer editor={editor} width={width} height={height} />
                  )
            }
          />
          {comparing && previousVideo && (
            <VideoPlayer
              key={previousVideo.url}
              src={previousVideo.url}
              frameRate={previousVideo.frameRate}
            />
          )}
        </div>
        <div className="group flex justify-end">
          <QuoteButton
            target={{
              kind: 'video',
              targetId: currentVideo.id,
              label: `${ordinalLabel(index)}・${ANGLE_LABEL[currentVideo.angle]}の動画`,
            }}
          />
        </div>
        {current.note && (
          <p className="rounded-card text-body bg-white p-4 text-sm whitespace-pre-wrap shadow-sm">
            {current.note}
          </p>
        )}
      </div>

      <aside className="space-y-4">
        {current.reply ? (
          <Card className="space-y-3">
            <h2 className="text-heading">送った添削</h2>
            <ReviewView
              reply={current.reply}
              videoLabel={angleOf}
              renderAction={(card) => (
                <QuoteButton
                  target={{
                    kind: 'card',
                    targetId: card.id,
                    label: `${ordinalLabel(index)}の添削・${KEY_POSITION_LABEL[card.position]}`,
                  }}
                />
              )}
            />
          </Card>
        ) : (
          <Card className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-heading">1. 画像を撮る</h2>
              <p className="text-caption text-muted">
                動画を止めて線を引き、キー位置を押すと、そのコマが画像になります。何枚でも撮れます。
                {current.videos.length > 1 && '角度を切り替えて、両方の動画から撮れます。'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {KEY_POSITIONS.map((position) => (
                  <Button
                    key={position}
                    variant="secondary"
                    size="sm"
                    disabled={closed}
                    onClick={() => capture(position)}
                  >
                    {KEY_POSITION_LABEL[position]}
                  </Button>
                ))}
              </div>
            </div>
            <CardDraftList
              drafts={cards.drafts}
              videoLabel={angleOf}
              onChange={cards.update}
              onRemove={cards.remove}
            />
            <label className="block space-y-2">
              <span className="text-heading">2. 説明</span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.currentTarget.value)}
                rows={5}
                maxLength={2000}
                placeholder="全体として何がどうなっていて、どう直してほしいか"
                className={inputClass}
              />
            </label>
            {drills.length > 0 && (
              <fieldset className="space-y-2">
                <legend className="text-heading">3. おすすめのドリル（3つまで）</legend>
                {drills.map((drill) => {
                  const checked = drillIds.includes(drill.id)
                  return (
                    <label key={drill.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && drillIds.length >= 3}
                        onChange={() =>
                          setDrillIds((prev) =>
                            checked ? prev.filter((id) => id !== drill.id) : [...prev, drill.id]
                          )
                        }
                        className="accent-mint mt-0.5 size-4"
                      />
                      {drill.title}
                    </label>
                  )
                })}
              </fieldset>
            )}
            {error && (
              <p role="alert" className="text-danger text-sm">
                {error}
              </p>
            )}
            <Button
              onClick={send}
              pending={sending}
              disabled={closed || cards.drafts.length === 0}
              size="lg"
              className="w-full"
            >
              {sending
                ? '送っています…'
                : cards.drafts.length === 0
                  ? '画像を撮ってください'
                  : `${cards.drafts.length}枚の画像と説明を送る`}
            </Button>
          </Card>
        )}
      </aside>
    </div>
  )
}
