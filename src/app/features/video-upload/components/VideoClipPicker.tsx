'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { CLIP_RULES, type ClipRange } from '../utils/clipPlan'

type Props = {
  file: File
  duration: number
  range: ClipRange
  onChange: (range: ClipRange, moved: 'start' | 'end') => void
}

const formatSeconds = (seconds: number): string => `${seconds.toFixed(1)}秒`

/**
 * 送る範囲を選ぶ。動画を見ながら「ここから」「ここまで」を押すか、つまみで選ぶ
 */
export const VideoClipPicker = ({ file, duration, range, onChange }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  const seek = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time
  }

  const setFromCurrent = (moved: 'start' | 'end') => {
    const time = videoRef.current?.currentTime ?? 0
    onChange(moved === 'start' ? { ...range, start: time } : { ...range, end: time }, moved)
  }

  const length = range.end - range.start

  return (
    <div className="space-y-3">
      {url && (
        // スマホでは全画面にせず、その場で再生する
        <video
          ref={videoRef}
          src={url}
          controls
          muted
          playsInline
          preload="metadata"
          className="aspect-video w-full rounded-xl bg-black object-contain"
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => setFromCurrent('start')}>
          ここから
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setFromCurrent('end')}>
          ここまで
        </Button>
      </div>
      <label className="block space-y-1">
        <span className="text-caption text-muted">開始 {formatSeconds(range.start)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={range.start}
          onChange={(event) => {
            const start = Number(event.currentTarget.value)
            onChange({ ...range, start }, 'start')
            seek(start)
          }}
          className="accent-mint w-full"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-caption text-muted">終了 {formatSeconds(range.end)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={range.end}
          onChange={(event) => {
            const end = Number(event.currentTarget.value)
            onChange({ ...range, end }, 'end')
            seek(end)
          }}
          className="accent-mint w-full"
        />
      </label>
      <p className="text-caption text-muted">
        送る長さ {formatSeconds(length)}（{CLIP_RULES.maxSeconds}
        秒まで）。スイングの前後を少し含めて選んでください。
      </p>
    </div>
  )
}
