'use client'

import { useRouter } from 'next/navigation'
import { type FormEvent, useCallback, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { submitSubmissionAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { VideoSlot, type VideoSlotHandle, type VideoSlotStatus } from './VideoSlot'

type Props = {
  threadId: string
  /** 最初の提出のときだけテーマ（直したいところ）を書いてもらう */
  needsTheme: boolean
  /** 1回に送れる動画の本数 */
  maxVideos: number
  maxBytes: number
  maxSeconds: number
  /** 送る前に確かめる文言（コーチが不在・返信遅れのとき、毎回出す）。確認しないなら null */
  confirmMessage: string | null
  /** 送るボタンの近くに出す一行（「通常48時間以内に添削が届きます」） */
  replyHint: string | null
  /** 提出できたとき（ドロワーを閉じるなど） */
  onSubmitted?: (() => void) | undefined
}

const IDLE_STATUS: VideoSlotStatus = { selected: false, ready: false, busy: false }

/** 1本目は正面、2本目は後方を最初に選んでおく（多くの人がこの2つを撮る） */
const DEFAULT_ANGLES = ['front', 'back'] as const

/**
 * 生徒の提出フォーム。動画1〜2本（正面と後方など）とテーマ・メモをまとめて1回で出す。
 * 動画は1本ずつ上げ（下書き）、そろったら提出を確定する
 */
export const SubmissionForm = ({
  threadId,
  needsTheme,
  maxVideos,
  maxBytes,
  maxSeconds,
  confirmMessage,
  replyHint,
  onSubmitted,
}: Props) => {
  const router = useRouter()
  const slots = useRef<Array<VideoSlotHandle | null>>([])
  const [statuses, setStatuses] = useState<VideoSlotStatus[]>(() =>
    Array.from({ length: maxVideos }, () => IDLE_STATUS)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 確認を出しているあいだ、送る内容をとっておく（「やめる」でも入力と動画は消さない）
  const pendingForm = useRef<FormData | null>(null)
  const [confirming, setConfirming] = useState(false)

  const onStatus = useCallback(
    (index: number) => (status: VideoSlotStatus) =>
      setStatuses((prev) => prev.map((s, i) => (i === index ? status : s))),
    []
  )
  // 枠ごとの関数は、描き直しても同じものを渡す（VideoSlot の effect が回り続けないように）
  const handlers = useRef(statuses.map((_, i) => onStatus(i)))

  const selected = statuses.filter((s) => s.selected)
  const busy = submitting || statuses.some((s) => s.busy)
  const canSubmit = selected.length > 0 && selected.every((s) => s.ready) && !busy

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const form = new FormData(event.currentTarget)
    if (confirmMessage) {
      pendingForm.current = form
      setConfirming(true)
      return
    }
    void submit(form)
  }

  const submit = async (form: FormData) => {
    setSubmitting(true)
    setError(null)
    // 1本ずつ上げる（同時に上げると、スマホの回線で両方とも遅くなる）
    const videoIds: string[] = []
    for (const [index, status] of statuses.entries()) {
      if (!status.selected) continue
      const videoId = await slots.current[index]?.upload()
      if (!videoId) {
        setSubmitting(false)
        return
      }
      videoIds.push(videoId)
    }
    form.set('threadId', threadId)
    for (const id of videoIds) form.append('videoId', id)
    const result = await submitSubmissionAction(IDLE_ACTION_STATE, form)
    setSubmitting(false)
    if (result.status === 'error') {
      setError(result.message)
      return
    }
    onSubmitted?.()
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-caption text-muted">
        1回に{maxVideos}本まで（正面と後方など）。1本{maxSeconds}秒までです。
      </p>
      {statuses.map((_, index) => (
        <VideoSlot
          // 枠の数はルールで決まっていて、並びは変わらない
          // biome-ignore lint/suspicious/noArrayIndexKey: 枠の位置そのものが識別子
          key={index}
          ref={(handle) => {
            slots.current[index] = handle
          }}
          threadId={threadId}
          label={index === 0 ? '1本目' : `${index + 1}本目（任意）`}
          defaultAngle={DEFAULT_ANGLES[index] ?? 'other'}
          maxBytes={maxBytes}
          maxSeconds={maxSeconds}
          disabled={submitting}
          onStatusChange={handlers.current[index] ?? onStatus(index)}
        />
      ))}
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
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button type="submit" disabled={!canSubmit} size="lg" className="w-full">
        {submitting ? '提出しています…' : '提出する'}
      </Button>
      {replyHint && <p className="text-caption text-muted text-center">{replyHint}</p>}
      <ConfirmDialog
        open={confirming}
        message={confirmMessage ?? ''}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          const form = pendingForm.current
          pendingForm.current = null
          if (form) void submit(form)
        }}
      />
    </form>
  )
}
