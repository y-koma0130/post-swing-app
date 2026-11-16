'use client'

import { type FormEvent, useActionState, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '@/app/components/ConfirmDialog'
import { Button } from '@/app/components/ui/Button'
import { FormMessage } from '@/app/components/ui/FormMessage'
import { inputClass } from '@/app/components/ui/fieldStyles'
import type { SendGuard } from '@/server/features/thread/domain/services/decideSendGuard.service'
import { sendChatMessageAction } from '@/server/features/thread/presentation/actions'
import { IDLE_ACTION_STATE } from '@/server/utils/actionState'

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
}

/**
 * チャットの入力欄（スレッドに1つ）。やりとりの表示は ThreadTimeline が持つ。
 * 送れるかどうか（終了・提出前・上限）は呼び出し側が決め、送れるときだけ置く
 */
export const ChatComposer = ({
  threadId,
  viewer,
  remaining,
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

  return (
    <>
      <form ref={formRef} action={action} onSubmit={onSubmit} className="space-y-2">
        <input type="hidden" name="threadId" value={threadId} />
        <input ref={hideRef} type="hidden" name="hideAbsenceNotice" disabled />
        {inputHint && <p className="text-caption text-muted">{inputHint}</p>}
        <textarea
          name="body"
          required
          rows={2}
          maxLength={1000}
          placeholder={viewer === 'coach' ? '補足を送る' : 'コーチに質問する'}
          className={inputClass}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-muted">
            {remaining !== undefined && `あと${remaining}通送れます`}
          </span>
          <Button type="submit" disabled={pending}>
            送る
          </Button>
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
          confirmedRef.current = true
          formRef.current?.requestSubmit()
        }}
      />
    </>
  )
}
