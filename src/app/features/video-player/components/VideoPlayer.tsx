'use client'

import { type CSSProperties, type ReactNode, useEffect } from 'react'
import { useVideoPlayer, type VideoSize } from '../hooks/useVideoPlayer'
import { formatFps, formatTimecode, PLAYBACK_RATES } from '../utils/frame'

export type RenderOverlay = (videoSize: VideoSize) => ReactNode

type Props = {
  src: string
  /** 動画にぴったり重ねて表示するもの（線引きなど）。動画の元の大きさを受け取る */
  renderOverlay?: RenderOverlay | undefined
}

/** 文字入力中やボタン上のキー操作は、プレイヤーのショートカットにしない */
const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

/** 読み込むまでは、スマホの縦動画を仮定して場所を取っておく */
const FALLBACK_SIZE: VideoSize = { width: 9, height: 16 }
/** 動画の高さの上限（画面の高さに対する割合） */
const MAX_HEIGHT = '65dvh'

/**
 * 幅いっぱい、ただし高さが MAX_HEIGHT を超えない大きさ。縦横比は動画に合わせる
 *
 * video 要素の max-height だけに任せると、外側の箱が動画の元の幅のまま残り、重ねる層がずれる
 */
const frameStyle = (size: VideoSize | null): CSSProperties => {
  const { width, height } = size ?? FALLBACK_SIZE
  return {
    width: `min(100%, calc(${MAX_HEIGHT} * ${width / height}))`,
    aspectRatio: `${width} / ${height}`,
  }
}

/**
 * スイング動画のプレイヤー。0.25x／0.5x／1x、1コマ送り・戻し、シークバー
 *
 * キーボード：← → でコマ送り、スペースで再生・停止
 */
export const VideoPlayer = ({ src, renderOverlay }: Props) => {
  const { videoRef, state, togglePlay, stepFrames, seek, setRate } = useVideoPlayer()
  const disabled = state.probing || state.durationSec === 0

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled || isTypingTarget(event.target)) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        stepFrames(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled, stepFrames, togglePlay])

  return (
    <div className="rounded-card overflow-hidden bg-white shadow-sm">
      <div className="relative flex justify-center bg-black">
        {/* 重ねる層が動画の映っている範囲とぴったり重なるよう、箱の縦横比を動画に合わせる */}
        <div className="relative" style={frameStyle(state.videoSize)}>
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full"
          />
          {renderOverlay && state.videoSize && renderOverlay(state.videoSize)}
        </div>
        {state.probing && (
          <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/80">
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

          <fieldset className="ml-2 flex rounded-full border border-gray-200 p-0.5">
            <legend className="sr-only">再生速度</legend>
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                aria-pressed={state.rate === rate}
                disabled={disabled}
                onClick={() => setRate(rate)}
                className={`rounded-full px-3 py-1 text-xs font-bold disabled:opacity-40 ${
                  state.rate === rate ? 'bg-ink text-white' : 'text-gray-600'
                }`}
              >
                {rate}x
              </button>
            ))}
          </fieldset>

          <p className="ml-auto font-mono text-xs text-gray-500">
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
  <button
    type="button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40 ${
      primary ? 'bg-mint text-ink' : 'border border-gray-200 bg-white text-gray-800'
    }`}
  >
    {children}
  </button>
)
