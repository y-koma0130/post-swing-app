'use client'

import {
  type FormEvent,
  type ReactNode,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { CHAT_INPUT_ID, useQuote } from '@/app/components/quote/QuoteContext'
import { Button } from '@/app/components/ui/Button'
import { iconButtonClass } from '@/app/components/ui/choiceStyles'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass, selectClass } from '@/app/components/ui/fieldStyles'
import { VideoSlot, type VideoSlotHandle } from '@/app/components/video/VideoSlot'
import { findMessageVideoLinks } from '@/app/utils/messageLinks'
import { youtubeThumbnailUrl } from '@/app/utils/youtubeEmbed'
import type { DrillDto } from '@/server/features/drill/application/dto/Drill.dto'
import type { SendGuard } from '@/server/features/thread/domain/services/decideSendGuard.service'
import { sendChatMessageAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

/** コーチだけが使う添付（ドリル・動画）の設定 */
type CoachAttachments = {
  drills: DrillDto[]
  maxVideoBytes: number
  maxVideoSeconds: number
}

type Props = {
  threadId: string
  viewer: 'coach' | 'student'
  /** 生徒があと何通送れるか（コーチは無制限なので出さない） */
  remaining?: number | undefined
  /** 入力欄の上の一行（「コーチは11/23まで不在です」「返信の目安：1〜2日」） */
  inputHint?: string | null | undefined
  /** 送る前の確認（生徒だけ） */
  guard?: SendGuard | undefined
  confirmMessage?: string | undefined
  /** コーチなら、ドリル・動画を添えられる */
  coach?: CoachAttachments | undefined
  /** 入力欄の下の段の左に置く操作（生徒の「スイング動画を送る」など） */
  actions?: ReactNode
  /** 長押しで引用できることを案内する（生徒の画面） */
  quoteByLongPress?: boolean | undefined
}

type Panel = 'none' | 'drill' | 'video'

type AttachPanel = Exclude<Panel, 'none'>

const PANEL_LABEL = {
  drill: '＋ドリル',
  video: '＋動画',
} satisfies Record<AttachPanel, string>

const ATTACH_PANELS: AttachPanel[] = ['drill', 'video']

/**
 * チャットの入力欄（スレッドに1つ）。やりとりの表示は ThreadTimeline が持つ。
 * 時系列の「引用する」で選んだものを、入力欄の上に置いて一緒に送る。
 * コーチはドリル・動画（お手本など）を添えられる。
 * YouTube の動画・Instagram の投稿は、本文に URL を貼れば時系列で展開される（コーチも生徒も）
 */
export const ChatComposer = ({
  threadId,
  viewer,
  remaining,
  inputHint,
  guard = 'none',
  confirmMessage,
  coach,
  actions,
  quoteByLongPress = false,
}: Props) => {
  const [state, action, pending] = useActionState(sendChatMessageAction, IDLE_ACTION_STATE)
  const { quote, setQuote } = useQuote()
  const formRef = useRef<HTMLFormElement>(null)
  const hideRef = useRef<HTMLInputElement>(null)
  const videoIdRef = useRef<HTMLInputElement>(null)
  const slotRef = useRef<VideoSlotHandle | null>(null)
  // 確認やアップロードのあとの送信は、もう止めない
  const readyRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [panel, setPanel] = useState<Panel>('none')
  const [drillId, setDrillId] = useState('')
  const [videoSelected, setVideoSelected] = useState(false)
  const [videoBusy, setVideoBusy] = useState(false)
  const [slotKey, setSlotKey] = useState(0)
  // 本文に貼った YouTube・Instagram を、送る前に知らせる
  const [body, setBody] = useState('')
  const bodyLinks = findMessageVideoLinks(body)

  // 送れたら入力欄・引用・添付を空にする（「やめる」のときは残す）
  useEffect(() => {
    if (state.status !== 'success') return
    formRef.current?.reset()
    setQuote(null)
    setPanel('none')
    setDrillId('')
    setVideoSelected(false)
    setSlotKey((k) => k + 1)
    setBody('')
  }, [state, setQuote])

  const onSlotStatus = useCallback((status: { selected: boolean; busy: boolean }) => {
    setVideoSelected(status.selected)
    setVideoBusy(status.busy)
  }, [])

  const submitNow = () => {
    readyRef.current = true
    formRef.current?.requestSubmit()
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const needsUpload = panel === 'video' && videoSelected
    // 確認も動画のアップロードも要らなければ、そのまま送る
    // （submit の最中に requestSubmit しても、ブラウザは無視する）
    if (readyRef.current || (guard === 'none' && !needsUpload)) {
      readyRef.current = false
      return
    }
    event.preventDefault()
    if (guard !== 'none') {
      setConfirming(true)
      return
    }
    void uploadThenSubmit()
  }

  // 動画を添えるときは、先に上げてから送る
  const uploadThenSubmit = async () => {
    if (panel === 'video' && videoSelected) {
      const uploaded = await slotRef.current?.upload()
      if (!uploaded?.ok || !videoIdRef.current) return
      videoIdRef.current.value = uploaded.videoId
    }
    submitNow()
  }

  const attaching = (panel === 'drill' && drillId !== '') || (panel === 'video' && videoSelected)

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} className="space-y-2">
        <input type="hidden" name="threadId" value={threadId} />
        <input ref={hideRef} type="hidden" name="hideAbsenceNotice" disabled />
        <input ref={videoIdRef} type="hidden" name="videoId" defaultValue="" />
        {panel === 'drill' && <input type="hidden" name="drillId" value={drillId} />}
        {quote && (
          <>
            <input type="hidden" name="quoteKind" value={quote.kind} />
            <input type="hidden" name="quoteTargetId" value={quote.targetId} />
            <div className="border-mint bg-surface flex items-center gap-2 rounded-lg border-l-2 px-3 py-2">
              <p className="text-caption text-muted min-w-0 flex-1 truncate">引用：{quote.label}</p>
              <button
                type="button"
                onClick={() => setQuote(null)}
                className={`${iconButtonClass} text-lg`}
                aria-label="引用を外す"
              >
                ×
              </button>
            </div>
          </>
        )}
        {coach && panel === 'drill' && (
          <select
            value={drillId}
            onChange={(event) => setDrillId(event.currentTarget.value)}
            className={selectClass}
            aria-label="送るドリル"
          >
            <option value="">ドリルを選ぶ</option>
            {coach.drills.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        )}
        {coach && panel === 'video' && (
          <VideoSlot
            key={slotKey}
            ref={(handle) => {
              slotRef.current = handle
            }}
            uploadUrl={`/api/threads/${threadId}/videos?purpose=chat`}
            chooseAngle={false}
            label="送る動画"
            defaultAngle="other"
            maxBytes={coach.maxVideoBytes}
            maxSeconds={coach.maxVideoSeconds}
            disabled={pending}
            onStatusChange={onSlotStatus}
          />
        )}
        {bodyLinks.length > 0 && (
          <ul className="space-y-1" aria-label="メッセージの下に出るもの">
            {bodyLinks.map((link) => (
              <li
                key={
                  link.kind === 'youtube' ? `${link.youtubeId}:${link.startSec}` : link.shortcode
                }
                className="bg-surface text-caption text-muted flex items-center gap-2 rounded-lg px-3 py-2"
              >
                {link.kind === 'youtube' && (
                  <img
                    src={youtubeThumbnailUrl(link.youtubeId, 'hqdefault')}
                    alt=""
                    className="aspect-video w-14 shrink-0 rounded object-cover"
                  />
                )}
                <span>
                  {link.kind === 'youtube' ? 'YouTube の動画' : 'Instagram の投稿'}
                  を、メッセージの下に出します
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <textarea
            id={CHAT_INPUT_ID}
            name="body"
            required={!attaching}
            rows={1}
            maxLength={1000}
            placeholder={viewer === 'coach' ? '補足を送る' : 'コーチに質問する'}
            onChange={(event) => setBody(event.currentTarget.value)}
            className={`${inputClass} field-sizing-content max-h-40 min-h-11 resize-none`}
          />
          <Button type="submit" pending={pending} disabled={videoBusy} className="shrink-0">
            送る
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-1">
            {actions}
            {coach &&
              ATTACH_PANELS.map((p) => (
                <Button
                  key={p}
                  variant={panel === p ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={panel === p}
                  onClick={() => setPanel(panel === p ? 'none' : p)}
                  disabled={p === 'drill' && coach.drills.length === 0}
                >
                  {PANEL_LABEL[p]}
                </Button>
              ))}
          </div>
          <p className="text-caption text-muted">
            {[
              remaining !== undefined ? `あと${remaining}通` : null,
              inputHint,
              quoteByLongPress && !quote ? '長押しで引用' : null,
            ]
              .filter(Boolean)
              .join('・')}
          </p>
        </div>
        {state.status === 'error' && <FormMessage state={state} />}
      </form>
      <ConfirmDialog
        open={confirming}
        message={confirmMessage ?? ''}
        checkboxLabel={
          guard === 'confirm_with_skip' ? 'この不在期間中は次から表示しない' : undefined
        }
        onCancel={() => setConfirming(false)}
        onConfirm={(hideFromNow) => {
          setConfirming(false)
          // 隠し項目は、選んだときだけ送る（disabled の項目はフォームに入らない）
          if (hideRef.current) {
            hideRef.current.disabled = !hideFromNow
            hideRef.current.value = 'on'
          }
          void uploadThenSubmit()
        }}
      />
    </>
  )
}
