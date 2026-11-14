'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { useVideoUpload } from '../hooks/useVideoUpload'

type Props = {
  threadId: string
  /** 最初の動画のときだけテーマ（直したいところ）を書いてもらう */
  needsTheme: boolean
  maxBytes: number
}

const MB = 1024 * 1024

/** 生徒が動画を送るフォーム */
export const VideoUploadForm = ({ threadId, needsTheme, maxBytes }: Props) => {
  const router = useRouter()
  const { state, upload } = useVideoUpload()
  const [file, setFile] = useState<File | null>(null)
  const tooLarge = file !== null && file.size > maxBytes

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file || tooLarge) return
    const form = new FormData(event.currentTarget)
    const ok = await upload({
      threadId,
      file,
      theme: String(form.get('theme') ?? ''),
      note: String(form.get('note') ?? ''),
    })
    if (ok) router.refresh()
  }

  const uploading = state.kind === 'uploading'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className={labelTextClass}>スイングの動画</span>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/*"
          required
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          className="block w-full text-sm"
        />
        {file && (
          <span className={`block text-xs ${tooLarge ? 'text-red-600' : 'text-gray-500'}`}>
            {(file.size / MB).toFixed(1)}MB
            {tooLarge &&
              `（${Math.floor(maxBytes / MB)}MBまでです。スイングの前後を切って短くしてください）`}
          </span>
        )}
      </label>
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
      {state.kind === 'error' && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}
      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="bg-mint h-full transition-[width]"
              style={{ width: `${Math.round(state.progress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">送信中… {Math.round(state.progress * 100)}%</p>
        </div>
      )}
      <Button type="submit" disabled={uploading || !file || tooLarge} className="w-full">
        動画を送る
      </Button>
    </form>
  )
}
