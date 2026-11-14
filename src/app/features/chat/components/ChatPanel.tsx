'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import { formatDateTime } from '@/app/utils/format'
import type { ThreadDetailDto } from '@/server/features/thread/application/dto/ThreadDetail.dto'
import { sendChatMessageAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

type Video = ThreadDetailDto['videos'][number]

type Props = {
  threadId: string
  video: Pick<Video, 'id' | 'messages' | 'remainingStudentMessages'>
  viewer: 'coach' | 'student'
  closed: boolean
}

/** 動画ごとのチャット。生徒は動画1本につき3通まで */
export const ChatPanel = ({ threadId, video, viewer, closed }: Props) => {
  const [state, action, pending] = useActionState(sendChatMessageAction, IDLE_ACTION_STATE)
  const formRef = useRef<HTMLFormElement>(null)
  const canSend = !closed && (viewer === 'coach' || video.remainingStudentMessages > 0)

  // 送れたら入力欄を空にする
  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      {video.messages.length > 0 && (
        <ul className="space-y-2">
          {video.messages.map((m) => {
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
        <form ref={formRef} action={action} className="space-y-2">
          <input type="hidden" name="threadId" value={threadId} />
          <input type="hidden" name="videoId" value={video.id} />
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
    </div>
  )
}
