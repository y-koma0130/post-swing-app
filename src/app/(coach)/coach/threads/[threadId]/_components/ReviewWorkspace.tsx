'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { QuoteButton } from '@/app/components/quote/QuoteContext'
import { Button } from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { chipClass, segmentClass, segmentGroupClass } from '@/app/components/ui/choiceStyles'
import { inputClass, smallSelectClass } from '@/app/components/ui/fieldStyles'
import { AnnotationLayer } from '@/app/features/annotation/components/AnnotationLayer'
import { AnnotationToolbar } from '@/app/features/annotation/components/AnnotationToolbar'
import {
  renderAnnotatedFrame,
  renderComparedFrame,
} from '@/app/features/annotation/components/renderAnnotatedFrame'
import { useAnnotationEditor } from '@/app/features/annotation/hooks/useAnnotationEditor'
import { CardDraftList } from '@/app/features/review-card/components/CardDraftList'
import { ReviewView } from '@/app/features/review-card/components/ReviewView'
import { useCardDrafts } from '@/app/features/review-card/hooks/useCardDrafts'
import { GolfProfileSummary } from '@/app/features/thread/components/GolfProfileSummary'
import { ComparePlayer } from '@/app/features/video-player/components/ComparePlayer'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'
import {
  cardQuoteLabel,
  cardVideoLabelOf,
  KEY_POSITION_LABEL,
  KEY_POSITIONS,
  ordinalLabel,
  submissionVideoLabel,
  videoQuoteLabel,
} from '@/app/utils/threadText'
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
  /** 生徒のゴルフの様子（最初の提出を見ているときに出す） */
  golfProfile: ThreadDetailDto['golfProfile']
  /** 添削を送れたとき（ドロワーを閉じる） */
  onSent: () => void
}

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
  golfProfile,
  onSent,
}: Props) => {
  const router = useRouter()
  const [comparing, setComparing] = useState(false)
  /** 比較で右に並べる動画（選んでいなければ、おすすめの1本） */
  const [chosenPartnerId, setChosenPartnerId] = useState<string | null>(null)
  /** 比較のとき、線を引く先の画面 */
  const [activePane, setActivePane] = useState<'left' | 'right'>('left')
  // 元に戻す・消すのキーボードは、線を引いている画面の分だけ受ける
  const editor = useAnnotationEditor({ keyboard: !comparing || activePane === 'left' })
  /** 比較のとき、右の画面に引く線 */
  const rightEditor = useAnnotationEditor({ keyboard: comparing && activePane === 'right' })
  const cards = useCardDrafts()
  const videoElement = useRef<HTMLVideoElement | null>(null)
  const rightVideoElement = useRef<HTMLVideoElement | null>(null)
  const [sending, setSending] = useState(false)
  /** 添削全体の説明と、おすすめのドリル（閉じても書きかけを残す） */
  const [comment, setComment] = useState('')
  const [drillIds, setDrillIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const current = submissions[index]
  const currentVideo = current?.videos[videoIndex] ?? current?.videos[0]
  // 比較で並べられる動画（スレッドのすべての提出の動画。いま見ている動画のほか）
  const candidates = submissions.flatMap((submission, i) =>
    submission.videos.map((video) => ({
      ...video,
      label: `${ordinalLabel(i)}・${submissionVideoLabel(video, submission.videos)}`,
    }))
  )
  const partners = candidates.filter((v) => v.id !== currentVideo?.id)
  const previousSubmission = index > 0 ? submissions[index - 1] : undefined
  // おすすめ：同じ提出のもう1本（正面と後方）→ 前回の同じ角度 → ほかの1本目
  const suggestedPartner =
    current?.videos.find((v) => v.id !== currentVideo?.id) ??
    previousSubmission?.videos.find((v) => v.angle === currentVideo?.angle) ??
    partners[0]
  const partner =
    partners.find((v) => v.id === chosenPartnerId) ??
    partners.find((v) => v.id === suggestedPartner?.id)
  const showCompare = comparing && partner !== undefined
  const leftLabel = candidates.find((v) => v.id === currentVideo?.id)?.label ?? '動画'

  const onVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoElement.current = video
  }, [])
  const onRightVideoElement = useCallback((video: HTMLVideoElement | null) => {
    rightVideoElement.current = video
  }, [])

  /** 線を引く画面を切り替える（道具と色は、前の画面から引き継ぐ） */
  const activatePane = (pane: 'left' | 'right') => {
    if (pane === activePane) return
    const [from, to] = pane === 'right' ? [editor, rightEditor] : [rightEditor, editor]
    to.setTool(from.tool)
    to.setColor(from.color)
    setActivePane(pane)
  }
  const activeEditor = showCompare && activePane === 'right' ? rightEditor : editor

  if (!current || !currentVideo) {
    return (
      <p className="rounded-card text-muted bg-white p-6 text-sm shadow-sm">
        まだ動画が届いていません。届いたらメールでお知らせします。
      </p>
    )
  }

  const angleOf = cardVideoLabelOf(current.videos)

  const resetLines = () => {
    editor.reset()
    rightEditor.reset()
  }

  const selectSubmission = (next: number) => {
    onIndexChange(next)
    onVideoIndexChange(0)
    // 別の動画に引いた線は持ち越さない
    resetLines()
  }

  const selectVideo = (next: number) => {
    onVideoIndexChange(next)
    resetLines()
  }

  const capture = async (position: KeyPosition) => {
    const video = videoElement.current
    if (!video) return
    video.pause()
    const rightVideo = showCompare ? rightVideoElement.current : null
    rightVideo?.pause()
    setError(null)
    try {
      // 比較しているときは、2本を並べた1枚にする（それぞれの線も一緒に）
      const image =
        rightVideo && partner
          ? await renderComparedFrame(
              { video, annotations: editor.annotations, label: leftLabel },
              { video: rightVideo, annotations: rightEditor.annotations, label: partner.label }
            )
          : await renderAnnotatedFrame(video, editor.annotations)
      cards.add({
        videoId: currentVideo.id,
        position,
        timeSec: video.currentTime,
        annotations: [...editor.annotations],
        image,
      })
      // 次のキー位置は、まっさらな状態から線を引く
      resetLines()
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
          <fieldset className={segmentGroupClass}>
            <legend className="sr-only">提出</legend>
            {submissions.map((submission, i) => (
              <button
                key={submission.id}
                type="button"
                aria-pressed={i === index}
                onClick={() => selectSubmission(i)}
                className={segmentClass(i === index)}
              >
                {ordinalLabel(i)}
                {submission.reply ? '（添削済み）' : ''}
              </button>
            ))}
          </fieldset>
          {partners.length > 0 && (
            <Button
              variant={comparing ? 'primary' : 'secondary'}
              size="sm"
              className="ml-auto"
              aria-pressed={comparing}
              onClick={() => {
                setComparing(!comparing)
                setActivePane('left')
                rightEditor.reset()
              }}
            >
              {comparing ? '比較をやめる' : '2本を比較する'}
            </Button>
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
                className={chipClass(video.id === currentVideo.id)}
              >
                {submissionVideoLabel(video, current.videos)}
                {cards.drafts.some((d) => d.videoId === video.id) &&
                  `（${cards.drafts.filter((d) => d.videoId === video.id).length}枚）`}
              </button>
            ))}
          </div>
        )}
        {showCompare && partner && (
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">右に並べる動画</span>
            <select
              value={partner.id}
              onChange={(event) => {
                setChosenPartnerId(event.currentTarget.value)
                rightEditor.reset()
              }}
              className={smallSelectClass}
            >
              {partners.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {!current.reply && (
          <div className="space-y-1">
            <AnnotationToolbar editor={activeEditor} />
            {showCompare && (
              <p className="text-caption text-muted">
                線は{activePane === 'left' ? '左' : '右'}
                の画面に引きます（押した画面に切り替わります）。キャプチャすると、2本が並んだ1枚の画像になります。
              </p>
            )}
          </div>
        )}
        {showCompare && partner ? (
          <ComparePlayer
            key={`${currentVideo.url}|${partner.url}`}
            activePane={activePane}
            onActivatePane={activatePane}
            left={{
              src: currentVideo.url,
              frameRate: currentVideo.frameRate,
              label: leftLabel,
              onVideoElement,
              renderOverlay: current.reply
                ? undefined
                : ({ width, height }) => (
                    <AnnotationLayer editor={editor} width={width} height={height} />
                  ),
            }}
            right={{
              src: partner.url,
              frameRate: partner.frameRate,
              label: partner.label,
              onVideoElement: onRightVideoElement,
              renderOverlay: current.reply
                ? undefined
                : ({ width, height }) => (
                    <AnnotationLayer editor={rightEditor} width={width} height={height} />
                  ),
            }}
          />
        ) : (
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
        )}
        <div className="group flex justify-end">
          <QuoteButton
            target={{
              kind: 'video',
              targetId: currentVideo.id,
              label: videoQuoteLabel(index, currentVideo, current.videos),
            }}
          />
        </div>
        {current.note && (
          <p className="rounded-card text-body bg-white p-4 text-sm whitespace-pre-wrap shadow-sm">
            {current.note}
          </p>
        )}
        {index === 0 && <GolfProfileSummary golfProfile={golfProfile} />}
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
                    label: cardQuoteLabel(index, card.position),
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
