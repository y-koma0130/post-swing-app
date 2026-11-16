'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { useVideoConversion } from '../hooks/useVideoConversion'
import { useVideoUpload } from '../hooks/useVideoUpload'
import { VideoClipPicker } from './VideoClipPicker'

type Props = {
  threadId: string
  /** 最初の動画のときだけテーマ（直したいところ）を書いてもらう */
  needsTheme: boolean
  maxBytes: number
  /** 送る前に確かめる文言（コーチが不在・返信遅れのとき、毎回出す）。確認しないなら null */
  confirmMessage: string | null
  /** 送るボタンの近くに出す一行（「通常48時間以内に添削が届きます」） */
  replyHint: string | null
}

const MB = 1024 * 1024

/**
 * 生徒が動画を送るフォーム
 *
 * 送る範囲を選んでもらい、ブラウザで H.264 の MP4 に変換してから送る。
 * 変換できないブラウザでは、元のファイルを（上限以内なら）そのまま送る
 */
export const VideoUploadForm = ({
  threadId,
  needsTheme,
  maxBytes,
  confirmMessage,
  replyHint,
}: Props) => {
  const router = useRouter()
  const { state, upload } = useVideoUpload()
  const conversion = useVideoConversion(maxBytes)
  const { file, analysis, range, progress: converting } = conversion
  const convertError = conversion.error

  const sendsAsIs = analysis.kind === 'as_is'
  const tooLarge = sendsAsIs && file !== null && file.size > maxBytes

  // 確認を出しているあいだ、送る内容をとっておく（「やめる」でも入力と動画は消さない）
  const pendingForm = useRef<FormData | null>(null)
  const [confirming, setConfirming] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || tooLarge || analysis.kind === 'reading') return
    const form = new FormData(event.currentTarget)
    if (confirmMessage) {
      pendingForm.current = form
      setConfirming(true)
      return
    }
    await send(form)
  }

  const send = async (form: FormData) => {
    const toSend = await conversion.prepare()
    if (!toSend) return
    const ok = await upload({
      threadId,
      file: toSend,
      theme: String(form.get('theme') ?? ''),
      note: String(form.get('note') ?? ''),
      frameRate: conversion.frameRate,
    })
    if (ok) router.refresh()
  }

  const uploading = state.kind === 'uploading'
  const busy = uploading || converting !== null || analysis.kind === 'reading'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className={labelTextClass}>スイングの動画</span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          required
          disabled={busy}
          onChange={(event) => conversion.select(event.currentTarget.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        {analysis.kind === 'reading' && (
          <span className="block text-xs text-gray-500">動画を読み込んでいます…</span>
        )}
        {sendsAsIs && file && (
          <span className={`block text-xs ${tooLarge ? 'text-red-600' : 'text-gray-500'}`}>
            {(file.size / MB).toFixed(1)}MB
            {tooLarge &&
              `（${Math.floor(maxBytes / MB)}MBまでです。スイングの前後を切って短くしてください）`}
          </span>
        )}
      </label>
      {analysis.kind === 'ready' && file && (
        <VideoClipPicker
          file={file}
          duration={analysis.info.duration}
          range={range}
          onChange={conversion.moveRange}
        />
      )}
      {needsTheme && (
        <label className="block space-y-2">
          <span className={labelTextClass}>直したいところ</span>
          <input
            name="theme"
            required
            maxLength={100}
            placeholder="例：トップで右ひざが流れる"
            className={inputClass}
          />
        </label>
      )}
      <label className="block space-y-2">
        <span className={labelTextClass}>メモ（クラブ・悩みなど）</span>
        <textarea name="note" rows={3} maxLength={1000} className={inputClass} />
      </label>
      {(convertError ?? (state.kind === 'error' ? state.message : null)) && (
        <p role="alert" className="text-sm text-red-600">
          {convertError ?? (state.kind === 'error' ? state.message : '')}
        </p>
      )}
      {converting !== null && (
        <Progress value={converting} label="動画を変換中…（この画面のままお待ちください）" />
      )}
      {uploading && <Progress value={state.progress} label="送信中…" />}
      <Button type="submit" disabled={busy || !file || tooLarge} className="w-full">
        動画を送る
      </Button>
      {replyHint && <p className="text-center text-xs text-gray-500">{replyHint}</p>}
      <ConfirmDialog
        open={confirming}
        message={confirmMessage ?? ''}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          const form = pendingForm.current
          pendingForm.current = null
          if (form) void send(form)
        }}
      />
    </form>
  )
}

const Progress = ({ value, label }: { value: number; label: string }) => (
  <div className="space-y-1">
    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
      <div
        className="bg-mint h-full transition-[width]"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
    <p className="text-xs text-gray-500">
      {label} {Math.round(value * 100)}%
    </p>
  </div>
)
