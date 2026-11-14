'use client'

import { useState } from 'react'
import { AnnotationLayer } from '@/app/features/annotation/components/AnnotationLayer'
import { AnnotationToolbar } from '@/app/features/annotation/components/AnnotationToolbar'
import { useAnnotationEditor } from '@/app/features/annotation/hooks/useAnnotationEditor'
import { VideoPlayer } from '@/app/features/video-player/components/VideoPlayer'

type Video = {
  id: string
  url: string
  note: string
}

type Props = {
  videos: Video[]
}

/**
 * 添削画面の作業エリア。動画プレイヤーに線引きの層を重ね、前回の動画と並べて比べられる
 *
 * 複数の feature を組み合わせるので、features/ ではなくこの画面の _components/ に置く
 */
export const ReviewWorkspace = ({ videos }: Props) => {
  const editor = useAnnotationEditor()
  const [index, setIndex] = useState(videos.length - 1)
  const [comparing, setComparing] = useState(false)
  const current = videos[index]
  const previous = index > 0 ? videos[index - 1] : undefined

  if (!current) {
    return (
      <p className="rounded-card bg-white p-6 text-sm text-gray-500 shadow-sm">
        まだ動画が届いていません。
      </p>
    )
  }

  const select = (next: number) => {
    setIndex(next)
    // 別の動画に引いた線は持ち越さない
    editor.reset()
  }

  return (
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
            {i + 1}本目
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
      <AnnotationToolbar editor={editor} />
      <div className={comparing && previous ? 'grid gap-3 md:grid-cols-2' : ''}>
        <VideoPlayer
          key={current.url}
          src={current.url}
          renderOverlay={({ width, height }) => (
            <AnnotationLayer editor={editor} width={width} height={height} />
          )}
        />
        {comparing && previous && <VideoPlayer key={previous.url} src={previous.url} />}
      </div>
      {current.note && (
        <p className="rounded-card bg-white p-4 text-sm whitespace-pre-wrap text-gray-700 shadow-sm">
          {current.note}
        </p>
      )}
    </div>
  )
}
