'use client'

import { type Ref, useEffect, useImperativeHandle, useState } from 'react'
import { buttonClass } from '@/app/components/ui/Button'
import { labelTextClass } from '@/app/components/ui/fieldStyles'
import { useVideoConversion } from '@/app/hooks/useVideoConversion'
import { type UploadOutcome, useVideoUpload } from '@/app/hooks/useVideoUpload'
import { ANGLE_LABEL, ANGLES } from '@/app/utils/threadText'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'
import { Progress } from './Progress'
import { VideoClipPicker } from './VideoClipPicker'

const MB = 1024 * 1024

/** 親（提出フォーム）から呼ぶ操作 */
export type VideoSlotHandle = {
  /**
   * 選んだ動画を変換して上げる。上げた動画の ID か、失敗の文言を返す。
   * onProgress を渡すと、この枠が画面から消えても変換・送信の進み具合を受け取れる
   */
  upload: (onProgress?: SlotProgress) => Promise<UploadOutcome>
}

/** 枠の進み具合（変換と送信のどちらか、0〜1） */
export type SlotProgress = (step: 'converting' | 'uploading', progress: number) => void

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
  /** 送り先（スレッドの動画・ドリルの動画で違う） */
  uploadUrl: string
  /** 「1本目」「2本目（任意）」 */
  label: string
  /** 最初の角度（1本目は正面、2本目は後方） */
  defaultAngle: VideoAngle
  maxBytes: number
  maxSeconds: number
  disabled: boolean
  /** 撮った角度を選ばせるか（生徒の提出だけ。チャットやドリルの動画では選ばない） */
  chooseAngle?: boolean | undefined
  onStatusChange: (status: VideoSlotStatus) => void
}

/**
 * 提出の動画1本分の枠。角度を選び、送る範囲を選び、送るときにブラウザで変換して上げる。
 * 変換できないブラウザでは、元のファイルを（上限以内なら）そのまま上げる
 */
export const VideoSlot = ({
  ref,
  uploadUrl,
  label,
  defaultAngle,
  maxBytes,
  maxSeconds,
  disabled,
  onStatusChange,
  chooseAngle = true,
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
    upload: async (onProgress) => {
      if (!file) return { ok: false, message: '動画を選んでください' }
      if (tooLarge || tooLong) return { ok: false, message: '動画が長すぎるか、大きすぎます' }
      const prepared = await conversion.prepare((value) => onProgress?.('converting', value))
      if (!prepared.ok) return prepared
      const toSend = prepared.file
      // 変換に失敗して元のファイルを送るときは、元の長さ
      const durationSec =
        toSend === file && analysis.kind === 'ready'
          ? analysis.info.duration
          : conversion.durationSec
      return upload({
        url: uploadUrl,
        file: toSend,
        angle,
        durationSec,
        frameRate: conversion.frameRate,
        onProgress: (value) => onProgress?.('uploading', value),
      })
    },
  }))

  const message =
    conversion.error ??
    (state.kind === 'error' ? state.message : null) ??
    (tooLong ? `動画は1本${maxSeconds}秒までです。スイングの前後を切って短くしてください` : null)

  return (
    <fieldset className="border-line rounded-card space-y-3 border p-4" disabled={disabled}>
      <legend className={`${labelTextClass} px-1`}>{label}</legend>
      {chooseAngle && (
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          className={`${buttonClass({ variant: 'secondary' })} has-focus-visible:ring-mint has-focus-visible:ring-2 has-focus-visible:ring-offset-2 has-disabled:cursor-not-allowed has-disabled:opacity-40`}
        >
          {file ? '動画を選び直す' : '動画を選ぶ'}
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            disabled={busy}
            onChange={(event) => void conversion.select(event.currentTarget.files?.[0] ?? null)}
            className="sr-only"
            aria-label={`${label}の動画`}
          />
        </label>
        <span className="text-caption text-muted min-w-0 truncate">
          {file ? file.name : '選んでいません'}
        </span>
      </div>
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
