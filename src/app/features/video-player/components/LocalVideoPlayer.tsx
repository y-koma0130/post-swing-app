'use client'

import { type ChangeEvent, useEffect, useState } from 'react'
import { type RenderOverlay, VideoPlayer } from './VideoPlayer'

type Props = {
  /** 動画を選ぶ前に出しておく動画 */
  defaultSrc: string
  defaultLabel: string
  renderOverlay?: RenderOverlay
  /** 動画を差し替えたとき（前の動画に描いた線を消すなど） */
  onSourceChange?: () => void
}

type PickedVideo = {
  url: string
  name: string
}

/**
 * 端末の動画を選んで、ブラウザの中だけで再生する（MOC ではアップロードしない）
 */
export const LocalVideoPlayer = ({
  defaultSrc,
  defaultLabel,
  renderOverlay,
  onSourceChange,
}: Props) => {
  const [picked, setPicked] = useState<PickedVideo | null>(null)

  // 差し替えたときと画面を離れたときに、前の動画のメモリを解放する
  useEffect(() => {
    if (!picked) return
    return () => URL.revokeObjectURL(picked.url)
  }, [picked])

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    setPicked({ url: URL.createObjectURL(file), name: file.name })
    onSourceChange?.()
  }

  const src = picked?.url ?? defaultSrc

  return (
    <div className="space-y-3">
      <VideoPlayer key={src} src={src} renderOverlay={renderOverlay} />
      <div className="flex items-center gap-3 text-sm">
        <label className="shrink-0 cursor-pointer rounded-full border border-gray-200 bg-white px-4 py-2 font-bold text-gray-800 hover:opacity-90">
          端末の動画を選ぶ
          <input type="file" accept="video/*" className="sr-only" onChange={onChange} />
        </label>
        <span className="truncate text-gray-500">{picked?.name ?? defaultLabel}</span>
      </div>
      <p className="text-xs text-gray-400">選んだ動画はこの端末の中だけで再生し、送信しません。</p>
    </div>
  )
}
