'use client'

import { type ReactNode, useCallback } from 'react'
import { Button } from '@/app/components/ui/Button'
import { usePlayerShortcuts } from '../hooks/usePlayerShortcuts'
import { useVideoPlayer, type VideoSize } from '../hooks/useVideoPlayer'
import { formatFps, formatTimecode, frameStyle } from '../utils/frame'
import { PlaybackRateGroup } from './PlaybackRateGroup'

export type RenderOverlay = (videoSize: VideoSize) => ReactNode

type Props = {
  src: string
  /** 送るときに測ったフレームレート。分からなければ null（少し再生して推定する） */
  frameRate?: number | null | undefined
  /** 動画にぴったり重ねて表示するもの（線引きなど）。動画の元の大きさを受け取る */
  renderOverlay?: RenderOverlay | undefined
  /** 動画の要素を受け取る（コマを画像にするときなどに使う） */
  onVideoElement?: ((video: HTMLVideoElement | null) => void) | undefined
}

/** 動画の高さの上限（画面の高さに対する割合） */
const MAX_HEIGHT = '65dvh'

/**
 * スイング動画のプレイヤー。0.25x／0.5x／1x、1コマ送り・戻し、シークバー
 *
 * キーボード：← → でコマ送り、スペースで再生・停止
 */
export const VideoPlayer = ({ src, frameRate = null, renderOverlay, onVideoElement }: Props) => {
  const { videoRef, state, togglePlay, stepFrames, seek, setRate } = useVideoPlayer(frameRate)
  const disabled = state.probing || state.durationSec === 0
  const setVideoElement = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video
      onVideoElement?.(video)
    },
    [videoRef, onVideoElement]
  )

  usePlayerShortcuts({ disabled, onStep: stepFrames, onToggle: togglePlay })

  return (
    <div className="rounded-card overflow-hidden bg-white shadow-sm">
      <div className="relative flex justify-center bg-black">
        {/* 重ねる層が動画の映っている範囲とぴったり重なるよう、箱の縦横比を動画に合わせる */}
        <div className="relative" style={frameStyle(state.videoSize, MAX_HEIGHT)}>
          <video
            ref={setVideoElement}
            src={src}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full"
          />
          {renderOverlay && state.videoSize && renderOverlay(state.videoSize)}
        </div>
        {state.probing && (
          <p className="text-caption absolute inset-x-0 bottom-3 text-center text-white/80">
            動画を読み込んでいます…
          </p>
        )}
      </div>

      <div className="space-y-3 p-4">
        <input
          type="range"
          aria-label="再生位置"
          min={0}
          max={state.durationSec}
          step="any"
          value={state.currentTimeSec}
          disabled={disabled}
          onChange={(event) => seek(Number(event.currentTarget.value))}
          className="accent-mint w-full"
        />

        <div className="flex flex-wrap items-center gap-2">
          <ControlButton label="1コマ戻す" disabled={disabled} onClick={() => stepFrames(-1)}>
            ◀︎ 1コマ
          </ControlButton>
          <ControlButton
            label={state.paused ? '再生' : '一時停止'}
            disabled={disabled}
            onClick={togglePlay}
            primary
          >
            {state.paused ? '再生' : '停止'}
          </ControlButton>
          <ControlButton label="1コマ進める" disabled={disabled} onClick={() => stepFrames(1)}>
            1コマ ▶︎
          </ControlButton>

          <PlaybackRateGroup rate={state.rate} disabled={disabled} onChange={setRate} />

          <p className="text-caption text-muted ml-auto font-mono">
            {formatTimecode(state.currentTimeSec)} / {formatTimecode(state.durationSec)}
            <span className="ml-2">
              {formatFps(state.frameDurationSec)}
              {state.frameRateSource === 'default' && '（仮）'}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

type ControlButtonProps = {
  label: string
  disabled: boolean
  onClick: () => void
  primary?: boolean
  children: ReactNode
}

const ControlButton = ({
  label,
  disabled,
  onClick,
  primary = false,
  children,
}: ControlButtonProps) => (
  <Button
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    variant={primary ? 'primary' : 'secondary'}
    size="sm"
  >
    {children}
  </Button>
)
