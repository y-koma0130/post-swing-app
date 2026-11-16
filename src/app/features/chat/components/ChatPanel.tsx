'use client'

import { type FormEvent, useActionState, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { formatDateTime } from '@/app/utils/format'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import type { SendGuard } from '@/server/features/thread/domain/services/decideSendGuard.service'
import { sendChatMessageAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Video = ThreadDetailDto['videos'][number]

/** システムメッセージ（文言は呼び出し側で作る） */
export type ChatNotice = { id: string; text: string; createdAt: Date }

type Props = {
  threadId: string
  video: Pick<Video, 'id' | 'messages' | 'remainingStudentMessages'>
  viewer: 'coach' | 'student'
  closed: boolean
  notices?: ChatNotice[] | undefined
  /** 入力欄の上の一行（「コーチは11/23まで不在です」「返信の目安：1〜2日」） */
  inputHint?: string | null | undefined
  /** 送る前の確認（生徒だけ） */
  guard?: SendGuard | undefined
  confirmMessage?: string | undefined
}

type TimelineItem =
  | { kind: 'message'; at: Date; message: Video['messages'][number] }
  | { kind: 'notice'; at: Date; notice: ChatNotice }

/** 動画ごとのチャット。生徒は動画1本につき3通まで */
export const ChatPanel = ({
  threadId,
  video,
  viewer,
  closed,
  notices = [],
  inputHint,
  guard = 'none',
  confirmMessage,
}: Props) => {
  const [state, action, pending] = useActionState(sendChatMessageAction, IDLE_ACTION_STATE)
  const formRef = useRef<HTMLFormElement>(null)
  const hideRef = useRef<HTMLInputElement>(null)
  // 確認で「送る」を押したあとの送信は、もう確認しない
  const confirmedRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const canSend = !closed && (viewer === 'coach' || video.remainingStudentMessages > 0)

  // 送れたら入力欄を空にする（「やめる」のときは残す）
  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (guard === 'none' || confirmedRef.current) {
      confirmedRef.current = false
      return
    }
    event.preventDefault()
    setConfirming(true)
  }

  const timeline: TimelineItem[] = [
    ...video.messages.map((message) => ({ kind: 'message' as const, at: message.sentAt, message })),
    ...notices.map((notice) => ({ kind: 'notice' as const, at: notice.createdAt, notice })),
  ].toSorted((a, b) => a.at.getTime() - b.at.getTime())

  return (
    <div className="space-y-3">
      {timeline.length > 0 && (
        <ul className="space-y-2">
          {timeline.map((item) => {
            if (item.kind === 'notice') {
              return (
                <li key={item.notice.id} className="text-center">
                  <p className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    {item.notice.text}
                  </p>
                </li>
              )
            }
            const m = item.message
            const mine = m.from === viewer
            return (
              <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    mine ? 'bg-mint-soft text-ink' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-1 text-[10px] text-gray-500">{formatDateTime(m.sentAt)}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {canSend ? (
        <form ref={formRef} action={action} onSubmit={onSubmit} className="space-y-2">
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="videoId" value={video.id} />
          <input ref={hideRef} type="hidden" name="hideAbsenceNotice" disabled />
          {inputHint && <p className="text-xs text-gray-500">{inputHint}</p>}
          <textarea
            name="body"
            required
            rows={2}
            maxLength={1000}
            placeholder={viewer === 'coach' ? '補足を送る' : 'コーチに質問する'}
            className={inputClass}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">
              {viewer === 'student' && `あと${video.remainingStudentMessages}通送れます`}
            </span>
            <Button type="submit" disabled={pending} className="px-5 py-2">
              送る
            </Button>
          </div>
          {state.status === 'error' && <FormMessage state={state} />}
        </form>
      ) : (
        <p className="text-xs text-gray-500">
          {closed
            ? 'このスレッドは終了しました'
            : 'この動画へのメッセージは送り終わりました。撮り直して送ってください'}
        </p>
      )}
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
          confirmedRef.current = true
          formRef.current?.requestSubmit()
        }}
      />
    </div>
  )
}
