'use client'

import { type FormEvent, startTransition, useActionState } from 'react'
import { type ActionState, IDLE_ACTION_STATE } from '@/server/utils/actionState'

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>

/**
 * Server Action で送るフォーム。入力のエラーは、ブラウザの吹き出しではなく FormMessage で出す（docs/ui-rules.md）。
 *
 * - form に `noValidate` と、返ってくる onSubmit を付ける
 * - form の action に直接渡すと、エラーのときも React が入力を最初の値に戻すので、ここから送る
 * - 送る前に確認ダイアログを出すときは、onSubmit の代わりに submit(form) を呼ぶ
 */
export const useActionForm = (formAction: FormAction) => {
  const [state, action, pending] = useActionState(formAction, IDLE_ACTION_STATE)

  /** 押したボタンの name・value も一緒に送る */
  const submit = (form: HTMLFormElement, submitter: HTMLElement | null = null) => {
    const formData = new FormData(form, submitter)
    startTransition(() => action(formData))
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const native = event.nativeEvent
    submit(event.currentTarget, native instanceof SubmitEvent ? native.submitter : null)
  }

  return { state, pending, onSubmit, submit }
}
