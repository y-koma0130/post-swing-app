'use client'

import { type FormEvent, useCallback, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { ShareConsentFields } from '@/app/components/ShareConsentFields'
import { Button } from '@/app/components/ui/Button'
import { inputClass, labelTextClass, selectClass } from '@/app/components/ui/fieldStyles'
import {
  VideoSlot,
  type VideoSlotHandle,
  type VideoSlotStatus,
} from '@/app/components/video/VideoSlot'
import {
  AGE_RANGE_LABEL,
  AGE_RANGES,
  ROUND_FREQUENCIES,
  ROUND_FREQUENCY_LABEL,
} from '@/app/utils/threadText'
import { submitSubmissionAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { useBackgroundSubmission } from '../hooks/useBackgroundSubmission'
import {
  type ReportProgress,
  type SubmissionOutcome,
  startBackgroundSubmission,
} from '../utils/backgroundSubmission'
import { ShootingGuide } from './ShootingGuide'

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
  /** 提出を始めたとき（ドロワーを閉じるなど）。続きは画面の外で進む */
  onStarted?: (() => void) | undefined
  /**
   * 申し込みの最初の提出で、添削の公開の許可も聞く（それ以外は null）。
   * required：モニターの申し込み（公開の許可が条件）
   */
  shareConsent?: Readonly<{ coachName: string; required: boolean }> | null | undefined
}

const IDLE_STATUS: VideoSlotStatus = { selected: false, ready: false, busy: false }

/** 1本目は正面、2本目は後方を最初に選んでおく（多くの人がこの2つを撮る） */
const DEFAULT_ANGLES = ['front', 'back'] as const

/**
 * 生徒の提出フォーム。動画1〜2本（正面と後方など）とテーマ・メモをまとめて1回で出す。
 * 動画は1本ずつ上げ（下書き）、そろったら提出を確定する。
 * 変換・送信・確定は画面の外（backgroundSubmission）で進めるので、フォームを閉じても別の画面へ移っても続く
 */
export const SubmissionForm = ({
  threadId,
  needsTheme,
  maxVideos,
  maxBytes,
  maxSeconds,
  confirmMessage,
  replyHint,
  onStarted,
  shareConsent = null,
}: Props) => {
  const [ageRange, setAgeRange] = useState('')
  const slots = useRef<Array<VideoSlotHandle | null>>([])
  const [statuses, setStatuses] = useState<VideoSlotStatus[]>(() =>
    Array.from({ length: maxVideos }, () => IDLE_STATUS)
  )
  const background = useBackgroundSubmission()
  // このスレッドの提出を画面の外で進めているあいだは、入力を止める
  const submitting = background.kind === 'running' && background.threadId === threadId
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
    submit(form)
  }

  const submit = (form: FormData) => {
    setError(null)
    form.set('threadId', threadId)
    const targets = statuses.flatMap((status, index) => (status.selected ? [index] : []))
    const handles = targets.map((index) => slots.current[index] ?? null)

    const run = async (report: ReportProgress): Promise<SubmissionOutcome> => {
      // 1本ずつ上げる（同時に上げると、スマホの回線で両方とも遅くなる）
      for (const [i, handle] of handles.entries()) {
        const videoNumber = i + 1
        if (!handle) return { ok: false, message: '動画を選び直してください' }
        const uploaded = await handle.upload((step, progress) =>
          report({ step, videoNumber, progress })
        )
        if (!uploaded.ok) return uploaded
        form.append('videoId', uploaded.videoId)
      }
      report({ step: 'submitting', videoNumber: handles.length, progress: 1 })
      const result = await submitSubmissionAction(IDLE_ACTION_STATE, form)
      return result.status === 'error' ? { ok: false, message: result.message } : { ok: true }
    }

    const started = startBackgroundSubmission({ threadId, videoCount: handles.length, run })
    if (!started) {
      setError('ほかの動画を送っています。終わってから、もう一度お試しください')
      return
    }
    onStarted?.()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-caption text-muted">
          1回に{maxVideos}本まで（正面と後方など）。1本{maxSeconds}秒までです。
        </p>
        <ShootingGuide />
      </div>
      {statuses.map((_, index) => (
        <VideoSlot
          // 枠の数はルールで決まっていて、並びは変わらない
          // biome-ignore lint/suspicious/noArrayIndexKey: 枠の位置そのものが識別子
          key={index}
          ref={(handle) => {
            slots.current[index] = handle
          }}
          uploadUrl={`/api/threads/${threadId}/videos`}
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
      {needsTheme && (
        <label className="block space-y-2">
          <span className={labelTextClass}>年代</span>
          <select
            name="ageRange"
            required
            value={ageRange}
            onChange={(event) => setAgeRange(event.currentTarget.value)}
            className={selectClass}
          >
            <option value="" disabled>
              選んでください
            </option>
            {AGE_RANGES.map((value) => (
              <option key={value} value={value}>
                {AGE_RANGE_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsTheme && (
        // コーチが添削の参考にする（任意）
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-2">
            <span className={labelTextClass}>ふだんのラウンド（任意）</span>
            <select name="roundFrequency" defaultValue="" className={selectClass}>
              <option value="">選ばない</option>
              {ROUND_FREQUENCIES.map((value) => (
                <option key={value} value={value}>
                  {ROUND_FREQUENCY_LABEL[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className={labelTextClass}>平均スコア（任意）</span>
            <input
              name="averageScore"
              type="number"
              inputMode="numeric"
              min={50}
              max={200}
              step={1}
              placeholder="例：98"
              className={inputClass}
            />
          </label>
        </div>
      )}
      {shareConsent && (
        <ShareConsentFields
          coachName={shareConsent.coachName}
          canPublish={ageRange !== '' && ageRange !== 'under_18'}
          required={shareConsent.required}
          current={null}
        />
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
      <Button type="submit" pending={submitting} disabled={!canSubmit} size="lg" className="w-full">
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
          if (form) submit(form)
        }}
      />
    </form>
  )
}
