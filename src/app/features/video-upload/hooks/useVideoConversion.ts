import { useCallback, useState } from 'react'
import {
  adjustClipRange,
  type ClipRange,
  defaultClipRange,
  planBitrate,
  planOutputSize,
} from '../utils/clipPlan'

/**
 * ブラウザ内での動画の読み取りと変換（WebCodecs を使う Mediabunny）
 *
 * iPhone の標準設定（高効率）は HEVC の .mov で、Windows・Android の Chrome では再生できないことがある。
 * 送る前に H.264 の MP4 へ変換し、送る範囲だけを切り出す。
 * Mediabunny は大きいので、使うときに読み込む
 */

export type VideoInfo = Readonly<{
  duration: number
  width: number
  height: number
  frameRate: number
  /** このブラウザで H.264 に変換できるか */
  canConvert: boolean
}>

const loadMediabunny = () => import('mediabunny')

/** 動画の長さ・大きさ・フレームレートを読む。読めない形式なら null */
const inspectVideo = async (file: File): Promise<VideoInfo | null> => {
  const { Input, ALL_FORMATS, BlobSource, canEncodeVideo } = await loadMediabunny()
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  try {
    const track = await input.getPrimaryVideoTrack()
    if (!track) return null
    const [duration, stats, canDecode] = await Promise.all([
      input.computeDuration(),
      track.computePacketStats(120),
      track.canDecode(),
    ])
    const size = planOutputSize(track.displayWidth, track.displayHeight)
    const canEncode = await canEncodeVideo('avc', size)
    return {
      duration,
      width: track.displayWidth,
      height: track.displayHeight,
      frameRate: stats.averagePacketRate,
      canConvert: canDecode && canEncode,
    }
  } catch {
    return null
  } finally {
    input.dispose()
  }
}

/**
 * 選んだ範囲を H.264 の MP4（音声なし）に変換する。失敗したら例外を投げる
 *
 * - 回転はメタデータに頼らずコマに焼き込む（添削のカード画像を canvas で作るため）
 * - 音声は外す（添削に使わず、Safari では AAC の変換ができないことがある）
 */
const convertVideo = async ({
  file,
  info,
  range,
  maxBytes,
  onProgress,
}: Readonly<{
  file: File
  info: VideoInfo
  range: ClipRange
  maxBytes: number
  onProgress: (progress: number) => void
}>): Promise<File> => {
  const {
    Input,
    ALL_FORMATS,
    BlobSource,
    Output,
    Mp4OutputFormat,
    BufferTarget,
    Conversion,
    Quality,
  } = await loadMediabunny()
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) })
  try {
    const target = new BufferTarget()
    const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target })
    const size = planOutputSize(info.width, info.height)
    const bitrate = planBitrate({
      ...size,
      frameRate: info.frameRate,
      seconds: range.end - range.start,
      maxBytes,
    })
    const conversion = await Conversion.init({
      input,
      output,
      tracks: 'primary',
      trim: { start: range.start, end: range.end },
      video: {
        codec: 'avc',
        width: size.width,
        height: size.height,
        fit: 'contain',
        // 数値だけを渡すと 0〜1 の画質の段階と解釈されるので、ビットレートとして明示する
        quality: new Quality({ bitrate, bitrateMode: 'variable' }),
        // 指定しないと、エンコーダーが 30fps の前提で1コマあたりのビットを配るので、
        // 120fps の動画は狙いの4倍ほどの大きさになる（Chrome で確認）
        ...(info.frameRate > 0 ? { frameRate: Math.round(info.frameRate) } : {}),
        allowTransformationMetadata: false,
        // コマ送りで前後へ動きやすいよう、キーフレームを多めに入れる
        keyFrameInterval: 1,
        forceTranscode: true,
      },
      audio: { discard: true },
    })
    if (!conversion.isValid) {
      throw new Error('この動画は変換できません')
    }
    conversion.onProgress = (progress) => onProgress(progress)
    await conversion.execute()
    if (!target.buffer) {
      throw new Error('変換した動画を取り出せませんでした')
    }
    const name = file.name.replace(/\.[^.]+$/, '') || 'swing'
    return new File([target.buffer], `${name}.mp4`, { type: 'video/mp4' })
  } finally {
    input.dispose()
  }
}

export type VideoAnalysis =
  | { kind: 'none' }
  | { kind: 'reading' }
  | { kind: 'ready'; info: VideoInfo }
  /**
   * 読めない、またはこのブラウザで変換できない。元のファイルをそのまま送る。
   * 長さはブラウザの再生機能で測る（測れなければ null）
   */
  | { kind: 'as_is'; duration: number | null }

/** 変換できない動画の長さを、ブラウザの再生機能で測る。測れなければ null */
const readDurationByPlayer = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (value: number | null) => {
      URL.revokeObjectURL(url)
      video.removeAttribute('src')
      resolve(value)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () =>
      done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null)
    video.onerror = () => done(null)
    video.src = url
  })

const MB = 1024 * 1024

/**
 * 送る動画を選んだときの読み取り、範囲の選択、送る直前の変換
 */
export const useVideoConversion = (maxBytes: number) => {
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<VideoAnalysis>({ kind: 'none' })
  const [range, setRange] = useState<ClipRange>({ start: 0, end: 0 })
  /** 変換の進み具合（0〜1）。変換していなければ null */
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const select = useCallback(async (selected: File | null) => {
    setFile(selected)
    setError(null)
    if (!selected) {
      setAnalysis({ kind: 'none' })
      return
    }
    setAnalysis({ kind: 'reading' })
    const info = await inspectVideo(selected).catch(() => null)
    if (info?.canConvert) {
      setAnalysis({ kind: 'ready', info })
      setRange(defaultClipRange(info.duration))
    } else {
      setAnalysis({
        kind: 'as_is',
        duration: info?.duration ?? (await readDurationByPlayer(selected)),
      })
    }
  }, [])

  const moveRange = useCallback(
    (next: ClipRange, moved: 'start' | 'end') => {
      if (analysis.kind !== 'ready') return
      setRange(adjustClipRange(next, analysis.info.duration, moved))
    },
    [analysis]
  )

  /** 送るファイルを用意する。変換に失敗したら、上限以内なら元のファイルにする。送れなければ null */
  const prepare = useCallback(async (): Promise<File | null> => {
    if (!file) return null
    if (analysis.kind !== 'ready') return file
    setProgress(0)
    try {
      return await convertVideo({
        file,
        info: analysis.info,
        range,
        maxBytes,
        onProgress: setProgress,
      })
    } catch {
      if (file.size <= maxBytes) return file
      setError(
        `動画を変換できませんでした。${Math.floor(maxBytes / MB)}MB以内になるよう、撮影し直すか短く編集してから送ってください`
      )
      return null
    } finally {
      setProgress(null)
    }
  }, [file, analysis, range, maxBytes])

  return {
    file,
    analysis,
    range,
    progress,
    error,
    /** 送るときのフレームレート。変換に失敗して元のファイルを送るときも同じ値 */
    frameRate: analysis.kind === 'ready' ? analysis.info.frameRate : null,
    /** 送る長さ（秒）。変換するなら選んだ範囲、そのまま送るなら動画の長さ。分からなければ null */
    durationSec:
      analysis.kind === 'ready'
        ? range.end - range.start
        : analysis.kind === 'as_is'
          ? analysis.duration
          : null,
    select,
    moveRange,
    prepare,
  }
}
