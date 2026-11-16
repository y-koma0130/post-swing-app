'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { findCoachAvailabilityFacts } from '@/server/features/coach/public'
import { notify } from '@/server/features/notification/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import {
  type SendChatMessageError,
  sendChatMessage,
} from '../application/usecases/sendChatMessage.usecase'
import {
  type SubmitSubmissionError,
  submitSubmission,
} from '../application/usecases/submitSubmission.usecase'
import {
  findDraftVideos,
  findThread,
  saveAbsenceAck,
  saveChatMessage,
  saveSubmission,
  saveThreadNotice,
} from '../infrastructure/repositories/threadRepository'

const CHAT_ERROR = {
  not_found: '送れませんでした',
  closed: 'このスレッドは終了しています',
  empty: 'メッセージを書いてください',
  too_long: 'メッセージは1000文字までです',
  no_submission: '最初の動画を提出してから、チャットを送れます',
  limit_reached: 'このスレッドで送れるメッセージの上限に達しました',
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
      body: formString(formData, 'body'),
      hideAbsenceNoticeFromNow: formChecked(formData, 'hideAbsenceNotice'),
      now: new Date(),
    },
    {
      findThread,
      findCoachAvailabilityFacts,
      saveThreadNotice,
      saveAbsenceAck,
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

const SUBMIT_ERROR = {
  not_found: '提出できませんでした',
  closed: 'このスレッドは終了しています',
  expired: 'このスレッドは期限が切れています',
  awaiting_reply: 'コーチの添削が届いてから、次を提出できます',
  submission_limit: 'このスレッドで提出できる回数に達しています',
  no_videos: '動画を選んでください',
  too_many_videos: '1回に送れる動画は2本までです',
  invalid_video: '動画をもう一度選び直してください',
  theme_required: '直したいところを書いてください',
  note_too_long: 'メモは1000文字までです',
} as const satisfies Record<SubmitSubmissionError, string>

/**
 * 提出を確定する（上げておいた動画1〜2本とテーマ・メモをまとめる）。
 * 動画は先に /api/threads/[threadId]/videos へ1本ずつ上げておく
 */
export const submitSubmissionAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const threadId = formString(formData, 'threadId')
  const result = await submitSubmission(
    {
      actor,
      threadId,
      theme: formString(formData, 'theme'),
      note: formString(formData, 'note'),
      videoIds: formData.getAll('videoId').filter((v): v is string => typeof v === 'string'),
      now: new Date(),
    },
    {
      findThread,
      findCoachAvailabilityFacts,
      findDraftVideos,
      saveSubmission,
      saveThreadNotice,
      notifySubmitted: (input) => notify({ kind: 'video_submitted', ...input }),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    return actionError(SUBMIT_ERROR[result.error])
  }
  revalidatePath(`/t/${threadId}`)
  revalidatePath(`/coach/threads/${threadId}`)
  return actionSuccess('提出しました')
}
