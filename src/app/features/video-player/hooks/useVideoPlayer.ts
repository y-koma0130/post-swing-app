import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_FRAME_DURATION_SEC,
  estimateFrameDuration,
  type FrameSample,
  frameDurationFromRate,
  type PlaybackRate,
  stepFrameTime,
} from '../utils/frame'

/** 読み込み直後にフレームレートを調べるため少しだけ再生する。その上限時間 */
const PROBE_TIMEOUT_MS = 3000
const MAX_SAMPLES = 120

// Safari 15.3 以前などは requestVideoFrameCallback がない。その場合は timeupdate で代用する
// （関数に分けるのは、if で video の型が never に絞られないようにするため）
const supportsVideoFrameCallback = (video: HTMLVideoElement): boolean =>
  'requestVideoFrameCallback' in video

/** known：送るときに測った値。estimated：再生して推定した値。default：仮の値 */
export type FrameRateSource = 'known' | 'default' | 'estimated'

import type { VideoSize } from '../utils/frame'

export type { VideoSize }

export type VideoPlayerState = {
  currentTimeSec: number
  durationSec: number
  /** 動画の元の大きさ。読み込むまでは null */
  videoSize: VideoSize | null
  paused: boolean
  rate: PlaybackRate
  frameDurationSec: number
  frameRateSource: FrameRateSource
  /** フレームレートを調べている間は操作させない */
  probing: boolean
}

const initialState = (frameRate: number | null): VideoPlayerState => ({
  currentTimeSec: 0,
  durationSec: 0,
  videoSize: null,
  paused: true,
  rate: 1,
  frameDurationSec:
    frameRate !== null && frameRate > 0
      ? frameDurationFromRate(frameRate)
      : DEFAULT_FRAME_DURATION_SEC,
  frameRateSource: frameRate !== null && frameRate > 0 ? 'known' : 'default',
  probing: false,
})

/**
 * `<video>` の再生・スロー・コマ送り
 *
 * フレームレートが分かっていればそれを使い、分からなければ少し再生して推定する。
 * 動画を差し替えるときは、呼び出し側で key を変えて作り直す
 */
export const useVideoPlayer = (knownFrameRate: number | null = null) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<VideoPlayerState>(() => initialState(knownFrameRate))
  // 推定が要るかは最初に決まる（動画を差し替えるときは key で作り直すため）
  const needsEstimate = state.frameRateSource !== 'known'

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let samples: FrameSample[] = []
    let probing = false
    let probeTimer: ReturnType<typeof setTimeout> | undefined
    let frameHandle: number | undefined
    const supportsFrameCallback = supportsVideoFrameCallback(video)

    const finishProbe = () => {
      if (!probing) return
      probing = false
      clearTimeout(probeTimer)
      video.pause()
      video.currentTime = 0
      setState((s) => ({ ...s, probing: false }))
    }

    const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
      setState((s) => ({ ...s, currentTimeSec: metadata.mediaTime }))

      if (!video.paused && needsEstimate) {
        samples = [
          ...samples.slice(-(MAX_SAMPLES - 1)),
          { mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames },
        ]
        const estimated = estimateFrameDuration(samples)
        if (estimated !== null) {
          setState((s) =>
            s.frameDurationSec === estimated && s.frameRateSource === 'estimated'
              ? s
              : { ...s, frameDurationSec: estimated, frameRateSource: 'estimated' }
          )
          finishProbe()
        }
      }

      frameHandle = video.requestVideoFrameCallback(onVideoFrame)
    }

    const onLoadedMetadata = () => {
      setState((s) => ({
        ...s,
        durationSec: Number.isFinite(video.duration) ? video.duration : 0,
        videoSize:
          video.videoWidth > 0 && video.videoHeight > 0
            ? { width: video.videoWidth, height: video.videoHeight }
            : null,
      }))
      if (!supportsFrameCallback || !needsEstimate) return

      probing = true
      clearTimeout(probeTimer)
      setState((s) => ({ ...s, probing: true }))
      probeTimer = setTimeout(finishProbe, PROBE_TIMEOUT_MS)
      video.play().catch(finishProbe)
    }

    const onTimeUpdate = () => {
      setState((s) => ({ ...s, currentTimeSec: video.currentTime }))
    }
    const onPlay = () => {
      setState((s) => ({ ...s, paused: false }))
    }
    const onPause = () => {
      setState((s) => ({ ...s, paused: true }))
    }
    // seek をまたぐと時刻の差が意味を持たないので、記録をやり直す
    const onSeeking = () => {
      samples = []
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('seeking', onSeeking)
    if (supportsFrameCallback) {
      frameHandle = video.requestVideoFrameCallback(onVideoFrame)
    } else {
      video.addEventListener('timeupdate', onTimeUpdate)
      video.addEventListener('seeked', onTimeUpdate)
    }
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      onLoadedMetadata()
    }

    return () => {
      clearTimeout(probeTimer)
      if (frameHandle !== undefined) {
        video.cancelVideoFrameCallback(frameHandle)
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('seeking', onSeeking)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('seeked', onTimeUpdate)
    }
  }, [needsEstimate])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      // 再生できない（読み込み前など）ときは何もしない
      video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [])

  const stepFrames = useCallback(
    (frames: number) => {
      const video = videoRef.current
      if (!video) return
      video.pause()
      video.currentTime = stepFrameTime({
        currentTimeSec: video.currentTime,
        frames,
        frameDurationSec: state.frameDurationSec,
        durationSec: video.duration,
      })
    },
    [state.frameDurationSec]
  )

  const seek = useCallback((timeSec: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = timeSec
    setState((s) => ({ ...s, currentTimeSec: timeSec }))
  }, [])

  const setRate = useCallback((rate: PlaybackRate) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setState((s) => ({ ...s, rate }))
  }, [])

  return { videoRef, state, togglePlay, stepFrames, seek, setRate }
}
