'use client'

import { type FormEvent, useActionState, useCallback, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { Drawer } from '@/app/components/ui/Drawer'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { Notice } from '@/app/components/ui/Notice'
import {
  VideoSlot,
  type VideoSlotHandle,
  type VideoSlotStatus,
} from '@/app/components/video/VideoSlot'
import { RETAKE_REASON_LABEL } from '@/app/utils/threadText'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import {
  declineRetakeAction,
  submitRetakeAction,
} from '@/server/features/thread/presentation/retakeActions'
import { actionError, IDLE_ACTION_STATE } from '@/server/utils/actionState'
import { ShootingGuide } from './ShootingGuide'

type Request = ThreadDetailDto['retake']['requests'][number]

type Props = {
  threadId: string
  coachName: string
  /** 開いている撮り直しのお願い */
  request: Request
  maxVideos: number
  maxBytes: number
  maxSeconds: number
}

const IDLE_SLOT: VideoSlotStatus = { selected: false, ready: false, busy: false }
const DEFAULT_ANGLES = ['front', 'back'] as const

/**
 * 生徒のスレッドに出す「撮り直しのお願い」。
 * 撮り直しを送る（提出の回数には数えない）か、今は撮れないと返す
 */
export const RetakeNotice = ({
  threadId,
  coachName,
  request,
  maxVideos,
  maxBytes,
  maxSeconds,
}: Props) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmingDecline, setConfirmingDecline] = useState(false)
  const [declineState, decline, declining] = useActionState(declineRetakeAction, IDLE_ACTION_STATE)
  const declineForm = useRef<HTMLFormElement>(null)

  return (
    <Notice
      tone="warning"
      emphasis
      title={`${coachName}さんから撮り直しのお願い`}
      className="space-y-3"
    >
      <div className="space-y-1">
        <p className="font-bold">{RETAKE_REASON_LABEL[request.reason]}</p>
        {request.message && <p className="whitespace-pre-wrap">{request.message}</p>}
        <p className="text-caption text-muted">
          撮り直した動画は、提出の回数には数えません。今すぐ撮れないときは「今は撮れない」を押すと、いまの動画で添削が届きます。
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setDrawerOpen(true)}>撮り直しを送る</Button>
        <form ref={declineForm} action={decline}>
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="requestId" value={request.id} />
          <Button
            variant="secondary"
            pending={declining}
            onClick={() => setConfirmingDecline(true)}
          >
            {declining ? '伝えています…' : '今は撮れない'}
          </Button>
        </form>
        <ShootingGuide />
      </div>
      <FormMessage state={declineState} />
      <ConfirmDialog
        open={confirmingDecline}
        message={`${coachName}さんに「今は撮り直せない」と伝えます。いまの動画で添削が届きます。`}
        confirmLabel="伝える"
        onCancel={() => setConfirmingDecline(false)}
        onConfirm={() => {
          setConfirmingDecline(false)
          declineForm.current?.requestSubmit()
        }}
      />
      <Drawer open={drawerOpen} title="撮り直しを送る" onClose={() => setDrawerOpen(false)}>
        <RetakeForm
          threadId={threadId}
          requestId={request.id}
          maxVideos={maxVideos}
          maxBytes={maxBytes}
          maxSeconds={maxSeconds}
          onDone={() => setDrawerOpen(false)}
        />
      </Drawer>
    </Notice>
  )
}

type FormProps = {
  threadId: string
  requestId: string
  maxVideos: number
  maxBytes: number
  maxSeconds: number
  onDone: () => void
}

/** 撮り直しの動画（1〜2本）を上げてから、まとめて送る */
const RetakeForm = ({
  threadId,
  requestId,
  maxVideos,
  maxBytes,
  maxSeconds,
  onDone,
}: FormProps) => {
  const [state, action, pending] = useActionState(submitRetakeAction, IDLE_ACTION_STATE)
  const [statuses, setStatuses] = useState<VideoSlotStatus[]>(() =>
    Array.from({ length: maxVideos }, () => IDLE_SLOT)
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const slots = useRef<Array<VideoSlotHandle | null>>([])
  const onStatus = useCallback(
    (index: number) => (status: VideoSlotStatus) =>
      setStatuses((prev) => prev.map((s, i) => (i === index ? status : s))),
    []
  )
  const handlers = useRef(statuses.map((_, i) => onStatus(i)))
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.status === 'success') onDone()
  }

  const selected = statuses.filter((s) => s.selected)
  const busy = uploading || pending || statuses.some((s) => s.busy)
  const canSubmit = selected.length > 0 && selected.every((s) => s.ready) && !busy

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    const form = new FormData()
    form.set('threadId', threadId)
    form.set('requestId', requestId)
    setUploadError(null)
    setUploading(true)
    // 1本ずつ上げる（同時に上げると、スマホの回線で両方とも遅くなる）
    for (const [index, status] of statuses.entries()) {
      if (!status.selected) continue
      const uploaded = await slots.current[index]?.upload()
      if (!uploaded?.ok) {
        setUploading(false)
        setUploadError(uploaded?.message ?? '動画を選び直してください')
        return
      }
      form.append('videoId', uploaded.videoId)
    }
    setUploading(false)
    action(form)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-caption text-muted">
          1回に{maxVideos}本まで。1本{maxSeconds}秒までです。提出の回数には数えません。
        </p>
        <ShootingGuide />
      </div>
      {statuses.map((_, index) => (
        <VideoSlot
          // biome-ignore lint/suspicious/noArrayIndexKey: 枠の位置そのものが識別子
          key={index}
          ref={(handle) => {
            slots.current[index] = handle
          }}
          uploadUrl={`/api/threads/${threadId}/videos?purpose=retake`}
          label={index === 0 ? '1本目' : `${index + 1}本目（任意）`}
          defaultAngle={DEFAULT_ANGLES[index] ?? 'other'}
          maxBytes={maxBytes}
          maxSeconds={maxSeconds}
          disabled={uploading || pending}
          onStatusChange={handlers.current[index] ?? onStatus(index)}
        />
      ))}
      <FormMessage state={uploadError ? actionError(uploadError) : state} />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        pending={uploading || pending}
        disabled={!canSubmit}
      >
        {uploading ? '動画を送っています…' : pending ? '送っています…' : '撮り直しを送る'}
      </Button>
    </form>
  )
}
