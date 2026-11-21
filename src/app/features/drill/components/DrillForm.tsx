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
import { segmentClass, segmentGroupClass } from '@/app/components/ui/choiceStyles'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, labelTextClass } from '@/app/components/ui/fieldStyles'
import { InstagramLink } from '@/app/components/video/InstagramLink'
import {
  VideoSlot,
  type VideoSlotHandle,
  type VideoSlotStatus,
} from '@/app/components/video/VideoSlot'
import { YoutubePlayer } from '@/app/components/video/YoutubePlayer'
import { formatStartSec } from '@/app/utils/youtubeEmbed'
import { parseInstagramUrl } from '@/server/features/drill/domain/services/parseInstagramUrl.service'
import { parseYoutubeUrl } from '@/server/features/drill/domain/services/parseYoutubeUrl.service'
import { instagramPostUrl } from '@/server/features/drill/domain/values/DrillVideo'
import { createDrillAction } from '@/server/features/drill/presentation/actions'
import { VIDEO_RULES } from '@/server/features/thread/domain/rules'
import { actionError, IDLE_ACTION_STATE } from '@/server/utils/actionState'

const IDLE_SLOT: VideoSlotStatus = { selected: false, ready: false, busy: false }

type VideoKind = 'upload' | 'youtube' | 'instagram'

const VIDEO_KIND_LABEL = {
  upload: 'アップロード',
  youtube: 'YouTube',
  instagram: 'Instagram',
} satisfies Record<VideoKind, string>

const VIDEO_KINDS: VideoKind[] = ['upload', 'youtube', 'instagram']

/**
 * ドリルの登録（名前・やり方・お手本の動画）。
 * お手本は、アップロードした動画（先に上げてから、その ID を付けて登録する）か、YouTube の動画・Instagram の投稿の URL
 */
export const DrillForm = () => {
  const [state, action, pending] = useActionState(createDrillAction, IDLE_ACTION_STATE)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [slot, setSlot] = useState<VideoSlotStatus>(IDLE_SLOT)
  const [videoKind, setVideoKind] = useState<VideoKind>('upload')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const youtube = parseYoutubeUrl(youtubeUrl)
  const [instagramUrl, setInstagramUrl] = useState('')
  const instagram = parseInstagramUrl(instagramUrl)
  // 登録できたら、動画の枠ごと作り直して空にする
  const [formKey, setFormKey] = useState(0)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.status === 'success') {
      setFormKey((key) => key + 1)
      setSlot(IDLE_SLOT)
      setYoutubeUrl('')
      setInstagramUrl('')
    }
  }
  const slotRef = useRef<VideoSlotHandle | null>(null)
  const onSlotStatus = useCallback((status: VideoSlotStatus) => setSlot(status), [])

  const busy = uploading || pending || slot.busy

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setUploadError(null)
    formData.set('videoKind', videoKind)
    if (videoKind === 'youtube') {
      if (!youtube) {
        setUploadError('YouTube の動画の URL を入れてください（例：https://youtu.be/…）')
        return
      }
      startTransition(() => action(formData))
      return
    }
    if (videoKind === 'instagram') {
      if (!instagram) {
        setUploadError(
          'Instagram の投稿かリールの URL を入れてください（例：https://www.instagram.com/reel/…）'
        )
        return
      }
      startTransition(() => action(formData))
      return
    }
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
    <form key={formKey} onSubmit={onSubmit} noValidate className="space-y-3">
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
      <fieldset className="space-y-2">
        <legend className={labelTextClass}>お手本の動画</legend>
        <div className={segmentGroupClass}>
          {VIDEO_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={videoKind === kind}
              disabled={busy}
              onClick={() => {
                setVideoKind(kind)
                setSlot(IDLE_SLOT)
                setUploadError(null)
              }}
              className={segmentClass(videoKind === kind)}
            >
              {VIDEO_KIND_LABEL[kind]}
            </button>
          ))}
        </div>
        {videoKind === 'upload' ? (
          <VideoSlot
            ref={(handle) => {
              slotRef.current = handle
            }}
            uploadUrl="/api/drill-videos"
            chooseAngle={false}
            label="アップロードする動画"
            defaultAngle="other"
            maxBytes={VIDEO_RULES.maxBytes}
            maxSeconds={VIDEO_RULES.maxDurationSeconds}
            disabled={uploading || pending}
            onStatusChange={onSlotStatus}
          />
        ) : videoKind === 'instagram' ? (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-caption text-muted">Instagram の投稿・リールの URL</span>
              <input
                name="instagramUrl"
                type="url"
                inputMode="url"
                value={instagramUrl}
                onChange={(event) => setInstagramUrl(event.target.value)}
                placeholder="https://www.instagram.com/reel/…"
                className={inputClass}
              />
            </label>
            <p className="text-caption text-muted">
              生徒が押すと、Instagram
              のアプリで投稿が開きます。鍵をかけたアカウントの投稿は、フォローしていない生徒には見えません。
            </p>
            {instagram && <InstagramLink url={instagramPostUrl(instagram)} />}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-caption text-muted">YouTube の動画の URL</span>
              <input
                name="youtubeUrl"
                type="url"
                inputMode="url"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://youtu.be/…"
                className={inputClass}
              />
            </label>
            <p className="text-caption text-muted">
              公開か限定公開の動画が使えます（Shorts も可）。YouTube の「共有」で開始位置を指定した
              URL なら、その位置から再生します。
            </p>
            {youtube && (
              <div className="space-y-1">
                <YoutubePlayer youtubeId={youtube.youtubeId} startSec={youtube.startSec} />
                {youtube.startSec > 0 && (
                  <p className="text-caption text-muted">
                    {formatStartSec(youtube.startSec)} から再生します
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>
      <label className="block space-y-1">
        <span className={labelTextClass}>やり方</span>
        <textarea name="description" rows={4} maxLength={1000} className={inputClass} />
      </label>
      <FormMessage state={uploadError ? actionError(uploadError) : state} />
      <Button
        type="submit"
        pending={uploading || pending}
        disabled={busy || (videoKind === 'upload' && slot.selected && !slot.ready)}
      >
        {uploading ? '動画を送っています…' : pending ? '登録しています…' : '登録する'}
      </Button>
    </form>
  )
}
