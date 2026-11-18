'use client'

import { type Ref, useEffect, useImperativeHandle, useState } from 'react'
import { labelTextClass } from '@/app/components/ui/fieldStyles'
import { ANGLE_LABEL, ANGLES } from '@/app/features/thread/utils/threadText'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'
import { useVideoConversion } from '../hooks/useVideoConversion'
import { useVideoUpload } from '../hooks/useVideoUpload'
import { Progress } from './Progress'
import { VideoClipPicker } from './VideoClipPicker'

const MB = 1024 * 1024

/** 親（提出フォーム）から呼ぶ操作 */
export type VideoSlotHandle = {
  /** 選んだ動画を変換して上げる。上げた動画の ID を返す。動画を選んでいない・失敗したら null */
  upload: () => Promise<string | null>
}

/** 親に知らせる、この枠の状態 */
export type VideoSlotStatus = {
  /** 動画を選んでいる */
  selected: boolean
  /** 送れる状態（読み込み中でなく、角度を選び、上限を超えていない） */
  ready: boolean
  /** 読み込み・変換・送信中 */
  busy: boolean
}

type Props = {
  ref: Ref<VideoSlotHandle>
  threadId: string
  /** 「1本目」「2本目（任意）」 */
  label: string
  /** 最初の角度（1本目は正面、2本目は後方） */
  defaultAngle: VideoAngle
  maxBytes: number
  maxSeconds: number
  disabled: boolean
  /** submission：生徒の提出（角度を選ぶ）、chat：コーチがチャットに添える（角度は選ばない） */
  purpose?: 'submission' | 'chat' | undefined
  onStatusChange: (status: VideoSlotStatus) => void
}

/**
 * 提出の動画1本分の枠。角度を選び、送る範囲を選び、送るときにブラウザで変換して上げる。
 * 変換できないブラウザでは、元のファイルを（上限以内なら）そのまま上げる
 */
export const VideoSlot = ({
  ref,
  threadId,
  label,
  defaultAngle,
  maxBytes,
  maxSeconds,
  disabled,
  onStatusChange,
  purpose = 'submission',
}: Props) => {
  const [angle, setAngle] = useState<VideoAngle>(defaultAngle)
  const conversion = useVideoConversion(maxBytes)
  const { state, upload } = useVideoUpload()
  const { file, analysis, range, progress: converting } = conversion

  const asIs = analysis.kind === 'as_is' ? analysis : null
  const tooLarge = asIs !== null && file !== null && file.size > maxBytes
  const tooLong = asIs?.duration != null && asIs.duration > maxSeconds
  const busy = analysis.kind === 'reading' || converting !== null || state.kind === 'uploading'
  const ready = file !== null && !busy && !tooLarge && !tooLong

  const selected = file !== null
  // onStatusChange は親が useCallback で固定して渡す
  useEffect(() => {
    onStatusChange({ selected, ready, busy })
  }, [onStatusChange, selected, ready, busy])

  useImperativeHandle(ref, () => ({
    upload: async () => {
      if (!file || tooLarge || tooLong) return null
      const toSend = await conversion.prepare()
      if (!toSend) return null
      // 変換に失敗して元のファイルを送るときは、元の長さ
      const durationSec =
        toSend === file && analysis.kind === 'ready'
          ? analysis.info.duration
          : conversion.durationSec
      const videoId = await upload({
        threadId,
        purpose,
        file: toSend,
        angle,
        durationSec,
        frameRate: conversion.frameRate,
      })
      return videoId
    },
  }))

  const message =
    conversion.error ??
    (state.kind === 'error' ? state.message : null) ??
    (tooLong ? `動画は1本${maxSeconds}秒までです。スイングの前後を切って短くしてください` : null)

  return (
    <fieldset className="border-line rounded-card space-y-3 border p-4" disabled={disabled}>
      <legend className={`${labelTextClass} px-1`}>{label}</legend>
      {purpose === 'submission' && (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="撮った角度">
          {ANGLES.map((value) => (
            <label
              key={value}
              className="has-checked:border-mint has-checked:bg-mint-soft has-checked:text-ink border-line text-muted cursor-pointer rounded-full border px-3 py-1 text-sm"
            >
              <input
                type="radio"
                className="sr-only"
                checked={angle === value}
                onChange={() => setAngle(value)}
              />
              {ANGLE_LABEL[value]}
            </label>
          ))}
        </div>
      )}
      <input
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/*"
        disabled={busy}
        onChange={(event) => void conversion.select(event.currentTarget.files?.[0] ?? null)}
        className="block w-full text-sm"
        aria-label={`${label}の動画`}
      />
      {analysis.kind === 'reading' && (
        <p className="text-caption text-muted">動画を読み込んでいます…</p>
      )}
      {asIs && file && (
        <p className={`text-caption ${tooLarge ? 'text-danger' : 'text-muted'}`}>
          {(file.size / MB).toFixed(1)}MB
          {tooLarge &&
            `（${Math.floor(maxBytes / MB)}MBまでです。スイングの前後を切って短くしてください）`}
        </p>
      )}
      {analysis.kind === 'ready' && file && (
        <VideoClipPicker
          file={file}
          duration={analysis.info.duration}
          range={range}
          onChange={conversion.moveRange}
        />
      )}
      {message && (
        <p role="alert" className="text-danger text-sm">
          {message}
        </p>
      )}
      {converting !== null && (
        <Progress value={converting} label="動画を変換中…（この画面のままお待ちください）" />
      )}
      {state.kind === 'uploading' && <Progress value={state.progress} label="送信中…" />}
    </fieldset>
  )
}
