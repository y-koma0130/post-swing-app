'use client'

import {
  type FormEvent,
  startTransition,
  useActionState,
  useCallback,
  useRef,
  useState,
} from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import {
  VideoSlot,
  type VideoSlotHandle,
  type VideoSlotStatus,
} from '@/app/features/video-upload/components/VideoSlot'
import { createDrillAction } from '@/server/features/drill/presentation/actions'
import { VIDEO_RULES } from '@/server/features/thread/domain/rules'
import { actionError, IDLE_ACTION_STATE } from '@/server/utils/actionState'

const IDLE_SLOT: VideoSlotStatus = { selected: false, ready: false, busy: false }

/**
 * ドリルの登録（名前・やり方・お手本の動画）。
 * 動画を先に上げてから、その ID を付けてドリルを登録する
 */
export const DrillForm = () => {
  const [state, action, pending] = useActionState(createDrillAction, IDLE_ACTION_STATE)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [slot, setSlot] = useState<VideoSlotStatus>(IDLE_SLOT)
  // 登録できたら、動画の枠ごと作り直して空にする
  const [formKey, setFormKey] = useState(0)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.status === 'success') {
      setFormKey((key) => key + 1)
      setSlot(IDLE_SLOT)
    }
  }
  const slotRef = useRef<VideoSlotHandle | null>(null)
  const onSlotStatus = useCallback((status: VideoSlotStatus) => setSlot(status), [])

  const busy = uploading || pending || slot.busy

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setUploadError(null)
    if (!slot.selected) {
      setUploadError('お手本の動画を選んでください')
      return
    }
    setUploading(true)
    const uploaded = await slotRef.current?.upload()
    setUploading(false)
    if (!uploaded?.ok) {
      setUploadError(uploaded?.message ?? '動画を送れませんでした')
      return
    }
    formData.set('videoId', uploaded.videoId)
    startTransition(() => action(formData))
  }

  return (
    <form key={formKey} onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className={labelTextClass}>名前</span>
        <input
          name="title"
          required
          maxLength={50}
          placeholder="例：右ひざキープの素振り"
          className={inputClass}
        />
      </label>
      <VideoSlot
        ref={(handle) => {
          slotRef.current = handle
        }}
        uploadUrl="/api/drill-videos"
        chooseAngle={false}
        label="お手本の動画"
        defaultAngle="other"
        maxBytes={VIDEO_RULES.maxBytes}
        maxSeconds={VIDEO_RULES.maxDurationSeconds}
        disabled={uploading || pending}
        onStatusChange={onSlotStatus}
      />
      <label className="block space-y-1">
        <span className={labelTextClass}>やり方</span>
        <textarea name="description" rows={4} maxLength={1000} className={inputClass} />
      </label>
      <FormMessage state={uploadError ? actionError(uploadError) : state} />
      <Button
        type="submit"
        pending={uploading || pending}
        disabled={busy || (slot.selected && !slot.ready)}
      >
        {uploading ? '動画を送っています…' : pending ? '登録しています…' : '登録する'}
      </Button>
    </form>
  )
}
