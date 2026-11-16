'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { notify } from '@/server/features/notification/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import {
  type SendChatMessageError,
  sendChatMessage,
} from '../application/usecases/sendChatMessage.usecase'
import { findThread, saveChatMessage } from '../infrastructure/repositories/threadRepository'

const CHAT_ERROR = {
  not_found: '送れませんでした',
  closed: 'このスレッドは終了しています',
  empty: 'メッセージを書いてください',
  too_long: 'メッセージは1000文字までです',
  limit_reached: 'この動画へのメッセージは3通まで送りました。撮り直して送ってください',
} as const satisfies Record<SendChatMessageError, string>

/** チャットを送る（コーチ・生徒の共通） */
export const sendChatMessageAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const threadId = formString(formData, 'threadId')
  const result = await sendChatMessage(
    {
      actor,
      threadId,
      videoId: formString(formData, 'videoId'),
      body: formString(formData, 'body'),
      now: new Date(),
    },
    {
      findThread,
      saveChatMessage,
      notifyChatMessage: (input) => notify({ kind: 'chat_message', ...input }),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    return actionError(CHAT_ERROR[result.error])
  }
  revalidatePath(`/t/${threadId}`)
  revalidatePath(`/coach/threads/${threadId}`)
  return actionSuccess('送りました')
}
