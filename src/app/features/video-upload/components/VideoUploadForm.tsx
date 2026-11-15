'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { useVideoUpload } from '../hooks/useVideoUpload'
import { convertVideo, inspectVideo, type VideoInfo } from '../hooks/videoConversion'
import { adjustClipRange, type ClipRange, defaultClipRange } from '../utils/clipPlan'
import { VideoClipPicker } from './VideoClipPicker'

type Props = {
  threadId: string
  /** 最初の動画のときだけテーマ（直したいところ）を書いてもらう */
  needsTheme: boolean
  maxBytes: number
}

const MB = 1024 * 1024

type Analysis =
  | { kind: 'none' }
  | { kind: 'reading' }
  | { kind: 'ready'; info: VideoInfo }
  /** 読めない、またはこのブラウザで変換できない。元のファイルをそのまま送る */
  | { kind: 'as_is' }

/**
 * 生徒が動画を送るフォーム
 *
 * 送る範囲を選んでもらい、ブラウザで H.264 の MP4 に変換してから送る。
 * 変換できないブラウザでは、元のファイルを（上限以内なら）そのまま送る
 */
export const VideoUploadForm = ({ threadId, needsTheme, maxBytes }: Props) => {
  const router = useRouter()
  const { state, upload } = useVideoUpload()
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<Analysis>({ kind: 'none' })
  const [range, setRange] = useState<ClipRange>({ start: 0, end: 0 })
  const [converting, setConverting] = useState<number | null>(null)
  const [convertError, setConvertError] = useState<string | null>(null)

  const sendsAsIs = analysis.kind === 'as_is'
  const tooLarge = sendsAsIs && file !== null && file.size > maxBytes

  const onSelect = async (selected: File | null) => {
    setFile(selected)
    setConvertError(null)
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
      setAnalysis({ kind: 'as_is' })
    }
  }

  /** 送るファイルを用意する。変換に失敗したら、上限以内なら元のファイルにする */
  const prepareFile = async (selected: File): Promise<File | null> => {
    if (analysis.kind !== 'ready') return selected
    setConverting(0)
    try {
      return await convertVideo({
        file: selected,
        info: analysis.info,
        range,
        maxBytes,
        onProgress: setConverting,
      })
    } catch {
      if (selected.size <= maxBytes) return selected
      setConvertError(
        `動画を変換できませんでした。${Math.floor(maxBytes / MB)}MB以内になるよう、撮影し直すか短く編集してから送ってください`
      )
      return null
    } finally {
      setConverting(null)
    }
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || tooLarge || analysis.kind === 'reading') return
    const form = new FormData(event.currentTarget)
    const toSend = await prepareFile(file)
    if (!toSend) return
    const ok = await upload({
      threadId,
      file: toSend,
      theme: String(form.get('theme') ?? ''),
      note: String(form.get('note') ?? ''),
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
          onChange={(event) => onSelect(event.currentTarget.files?.[0] ?? null)}
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
          onChange={(next, moved) => setRange(adjustClipRange(next, analysis.info.duration, moved))}
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
