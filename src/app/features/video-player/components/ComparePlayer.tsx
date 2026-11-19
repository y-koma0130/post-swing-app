'use client'

import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Button } from '@/app/components/ui/Button'
import { segmentClass, segmentGroupClass } from '@/app/components/ui/choiceStyles'
import { useVideoPlayer, type VideoSize } from '../hooks/useVideoPlayer'
import { formatTimecode, PLAYBACK_RATES, type PlaybackRate, stepFrameTime } from '../utils/frame'
import { linkedTime, needsResync, offsetOf } from '../utils/linkedPlayback'
import type { RenderOverlay } from './VideoPlayer'

export type ComparePane = {
  src: string
  frameRate: number | null
  /** 画面の上に出す呼び方（「1回目・正面」など） */
  label: string
  renderOverlay?: RenderOverlay | undefined
  onVideoElement?: ((video: HTMLVideoElement | null) => void) | undefined
}

type Props = {
  left: ComparePane
  right: ComparePane
  /** 線を引く先として選んでいる画面 */
  activePane: 'left' | 'right'
  onActivatePane: (pane: 'left' | 'right') => void
}

/** 文字入力中やボタン上のキー操作は、プレイヤーのショートカットにしない */
const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const FALLBACK_SIZE: VideoSize = { width: 9, height: 16 }

/** 動画の箱の大きさ（縦横比は動画に合わせる。高さは画面に収める） */
const frameStyle = (size: VideoSize | null): CSSProperties => {
  const { width, height } = size ?? FALLBACK_SIZE
  // 並べたとき（タブレット・PC）は高め、縦に積むとき（スマホ）は2本が画面に収まる高さ
  return {
    width: `min(100%, calc(var(--compare-max-h) * ${width / height}))`,
    aspectRatio: `${width} / ${height}`,
  }
}

const formatOffset = (offsetSec: number): string => {
  const rounded = Math.round(offsetSec * 100) / 100
  if (rounded === 0) return 'ずれ 0秒'
  return `右が ${Math.abs(rounded).toFixed(2)}秒 ${rounded > 0 ? '先' : '後'}`
}

/**
 * 2本の動画を並べて、タイミングを合わせて再生・コマ送りする（比較）
 *
 * 1. それぞれの画面の下の操作で、2本を同じ瞬間（インパクトなど）に止める
 * 2. 下の共通の操作（再生・コマ送り・シークバー）で、そのずれを保ったまま2本を一緒に動かす
 *
 * キーボード：← → で2本一緒にコマ送り、スペースで2本一緒に再生・停止
 */
export const ComparePlayer = ({ left, right, activePane, onActivatePane }: Props) => {
  const l = useVideoPlayer(left.frameRate)
  const r = useVideoPlayer(right.frameRate)
  const [rate, setRateState] = useState<PlaybackRate>(1)
  /** 一緒に再生しているあいだのずれ（再生を始めたときに決める） */
  const playOffset = useRef<number | null>(null)
  const disabled =
    l.state.probing || r.state.probing || l.state.durationSec === 0 || r.state.durationSec === 0
  const playing = !l.state.paused || !r.state.paused
  const offset = offsetOf(l.state.currentTimeSec, r.state.currentTimeSec)

  const setLeftElement = useCallback(
    (video: HTMLVideoElement | null) => {
      l.videoRef.current = video
      left.onVideoElement?.(video)
    },
    [l.videoRef, left.onVideoElement]
  )
  const setRightElement = useCallback(
    (video: HTMLVideoElement | null) => {
      r.videoRef.current = video
      right.onVideoElement?.(video)
    },
    [r.videoRef, right.onVideoElement]
  )

  const pauseBoth = useCallback(() => {
    l.videoRef.current?.pause()
    r.videoRef.current?.pause()
    playOffset.current = null
  }, [l.videoRef, r.videoRef])

  const toggleBoth = useCallback(() => {
    const lv = l.videoRef.current
    const rv = r.videoRef.current
    if (!lv || !rv) return
    if (!lv.paused || !rv.paused) {
      pauseBoth()
      return
    }
    playOffset.current = offsetOf(lv.currentTime, rv.currentTime)
    lv.playbackRate = rate
    rv.playbackRate = rate
    void lv.play().catch(() => undefined)
    void rv.play().catch(() => undefined)
  }, [l.videoRef, r.videoRef, rate, pauseBoth])

  /** 左を nextLeft に動かし、右はずれを保って付いていく */
  const moveBoth = useCallback(
    (nextLeft: number) => {
      const lv = l.videoRef.current
      const rv = r.videoRef.current
      if (!lv || !rv) return
      const keep = offsetOf(lv.currentTime, rv.currentTime)
      pauseBoth()
      l.seek(nextLeft)
      r.seek(linkedTime(nextLeft, keep, rv.duration))
    },
    [l, r, pauseBoth]
  )

  const stepBoth = useCallback(
    (frames: number) => {
      const lv = l.videoRef.current
      if (!lv) return
      moveBoth(
        stepFrameTime({
          currentTimeSec: lv.currentTime,
          frames,
          frameDurationSec: l.state.frameDurationSec,
          durationSec: lv.duration,
        })
      )
    },
    [l.videoRef, l.state.frameDurationSec, moveBoth]
  )

  const setRate = (next: PlaybackRate) => {
    setRateState(next)
    for (const video of [l.videoRef.current, r.videoRef.current]) {
      if (video) video.playbackRate = next
    }
  }

  // 一緒に再生しているあいだ、右が左から大きくずれたら合わせ直す。どちらかが止まったら、もう片方も止める
  useEffect(() => {
    if (!playing) return
    let handle = 0
    const tick = () => {
      const lv = l.videoRef.current
      const rv = r.videoRef.current
      const keep = playOffset.current
      if (lv && rv && keep !== null) {
        if (lv.paused || lv.ended) {
          rv.pause()
        } else if (
          needsResync({
            leftTimeSec: lv.currentTime,
            rightTimeSec: rv.currentTime,
            offsetSec: keep,
            rightDurationSec: rv.duration,
          })
        ) {
          rv.currentTime = linkedTime(lv.currentTime, keep, rv.duration)
        }
      }
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [playing, l.videoRef, r.videoRef])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (disabled || isTypingTarget(event.target)) return
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        stepBoth(event.key === 'ArrowLeft' ? -1 : 1)
      } else if (event.key === ' ' && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        toggleBoth()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [disabled, stepBoth, toggleBoth])

  const pane = (
    side: 'left' | 'right',
    config: ComparePane,
    player: typeof l,
    setElement: (video: HTMLVideoElement | null) => void
  ): ReactNode => {
    const active = activePane === side
    const paneDisabled = player.state.probing || player.state.durationSec === 0
    return (
      <div
        className={`rounded-card overflow-hidden bg-white shadow-sm ring-2 transition-shadow ${
          active ? 'ring-mint' : 'ring-transparent'
        }`}
        // 押した画面に線を引く
        onPointerDownCapture={(_event: ReactPointerEvent<HTMLDivElement>) => onActivatePane(side)}
      >
        <div className="relative flex justify-center bg-black">
          <div className="relative" style={frameStyle(player.state.videoSize)}>
            <video
              ref={setElement}
              src={config.src}
              muted
              playsInline
              preload="auto"
              className="absolute inset-0 h-full w-full"
            />
            {config.renderOverlay &&
              player.state.videoSize &&
              config.renderOverlay(player.state.videoSize)}
          </div>
          <span className="text-caption pointer-events-none absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 font-bold text-white">
            {config.label}
          </span>
          {player.state.probing && (
            <p className="text-caption absolute inset-x-0 bottom-3 text-center text-white/80">
              動画を読み込んでいます…
            </p>
          )}
        </div>
        {/* この画面だけを動かす（2本を同じ瞬間に合わせるため） */}
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            type="button"
            aria-label={`${config.label}を1コマ戻す`}
            disabled={paneDisabled}
            onClick={() => {
              pauseBoth()
              player.stepFrames(-1)
            }}
            className="text-body hover:bg-surface active:bg-surface rounded-full px-2 py-1 text-sm disabled:opacity-40"
          >
            ◀︎
          </button>
          <input
            type="range"
            aria-label={`${config.label}の再生位置`}
            min={0}
            max={player.state.durationSec}
            step="any"
            value={player.state.currentTimeSec}
            disabled={paneDisabled}
            onChange={(event) => {
              pauseBoth()
              player.seek(Number(event.currentTarget.value))
            }}
            className="accent-ink min-w-0 flex-1"
          />
          <button
            type="button"
            aria-label={`${config.label}を1コマ進める`}
            disabled={paneDisabled}
            onClick={() => {
              pauseBoth()
              player.stepFrames(1)
            }}
            className="text-body hover:bg-surface active:bg-surface rounded-full px-2 py-1 text-sm disabled:opacity-40"
          >
            ▶︎
          </button>
          <span className="text-caption text-muted font-mono">
            {formatTimecode(player.state.currentTimeSec)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 [--compare-max-h:36dvh] md:[--compare-max-h:58dvh]">
      <div className="grid gap-3 md:grid-cols-2">
        {pane('left', left, l, setLeftElement)}
        {pane('right', right, r, setRightElement)}
      </div>

      {/* 2本を一緒に動かす */}
      <div className="rounded-card space-y-3 bg-white p-4 shadow-sm">
        <p className="text-caption text-muted">
          それぞれの画面の下の ◀︎ ▶︎
          で2本を同じ瞬間（インパクトなど）に止めてから、下の操作で2本を一緒に動かします。
          <span className="text-body ml-1 font-bold">{formatOffset(offset)}</span>
        </p>
        <input
          type="range"
          aria-label="2本一緒の再生位置（左の動画の時間）"
          min={0}
          max={l.state.durationSec}
          step="any"
          value={l.state.currentTimeSec}
          disabled={disabled}
          onChange={(event) => moveBoth(Number(event.currentTarget.value))}
          className="accent-mint w-full"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label="2本一緒に1コマ戻す"
            disabled={disabled}
            onClick={() => stepBoth(-1)}
          >
            ◀︎ 1コマ
          </Button>
          <Button size="sm" disabled={disabled} onClick={toggleBoth}>
            {playing ? '2本とも停止' : '2本一緒に再生'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="2本一緒に1コマ進める"
            disabled={disabled}
            onClick={() => stepBoth(1)}
          >
            1コマ ▶︎
          </Button>
          <fieldset className={`${segmentGroupClass} ml-2`}>
            <legend className="sr-only">再生速度</legend>
            {PLAYBACK_RATES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={rate === value}
                disabled={disabled}
                onClick={() => setRate(value)}
                className={segmentClass(rate === value)}
              >
                {value}x
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </div>
  )
}
