'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { notify } from '@/server/features/notification/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { declineRetake } from '../application/usecases/declineRetake.usecase'
import {
  type RequestRetakeError,
  requestRetake,
} from '../application/usecases/requestRetake.usecase'
import { type SubmitRetakeError, submitRetake } from '../application/usecases/submitRetake.usecase'
import {
  closeRetakeRequest,
  findRetakeRequests,
  saveRetakeRequest,
  saveRetakeVideos,
} from '../infrastructure/repositories/retakeRepository'
import { findDraftVideos, findThread } from '../infrastructure/repositories/threadRepository'

const revalidateThread = (threadId: string) => {
  revalidatePath(`/t/${threadId}`)
  revalidatePath(`/coach/threads/${threadId}`)
  revalidatePath('/coach')
}

const REQUEST_ERROR = {
  not_found: 'スレッドが見つかりません',
  invalid_reason: '理由を選んでください',
  message_too_long: 'ひとことは200文字までです',
  not_in_lesson: '添削を待っている動画があるときだけ、お願いできます',
  not_waiting: '添削を待っている、いちばん新しい動画にだけお願いできます',
  already_open: 'お願いへの返事を待っています',
  retake_limit: 'このスレッドでお願いできる回数（2回）に達しています',
} as const satisfies Record<RequestRetakeError, string>

/** コーチが撮り直しをお願いする */
export const requestRetakeAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const result = await requestRetake(
    {
      actor,
      threadId,
      submissionId: formString(formData, 'submissionId'),
      reason: formString(formData, 'reason'),
      message: formString(formData, 'message'),
      now: new Date(),
    },
    {
      findThread,
      findRetakeRequests,
      saveRetakeRequest,
      notifyRetakeRequested: (input) => notify({ kind: 'retake_requested', ...input }),
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) return actionError(REQUEST_ERROR[result.error])
  revalidateThread(threadId)
  return actionSuccess('撮り直しをお願いしました。生徒に LINE で知らせます')
}

const SUBMIT_ERROR = {
  not_found: '送れませんでした',
  no_retake: '撮り直しのお願いは、もう終わっています',
  no_videos: '動画を選んでください',
  too_many_videos: '1回に送れる動画は2本までです',
  invalid_video: '動画をもう一度選び直してください',
} as const satisfies Record<SubmitRetakeError, string>

/**
 * 生徒が撮り直しの動画を送る（動画は先に /api/threads/[threadId]/videos?purpose=retake へ上げておく）
 */
export const submitRetakeAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const result = await submitRetake(
    {
      actor,
      threadId,
      requestId: formString(formData, 'requestId'),
      videoIds: formData.getAll('videoId').filter((v): v is string => typeof v === 'string'),
      now: new Date(),
    },
    {
      findThread,
      findRetakeRequests,
      findDraftVideos,
      saveRetakeVideos,
      notifyRetakeSent: (input) => notify({ kind: 'retake_sent', ...input }),
    }
  )
  if (!result.ok) return actionError(SUBMIT_ERROR[result.error])
  revalidateThread(threadId)
  return actionSuccess('撮り直しの動画を送りました')
}

/** 生徒が「今は撮れない」と返す */
export const declineRetakeAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const result = await declineRetake(
    { actor, threadId, requestId: formString(formData, 'requestId'), now: new Date() },
    {
      findThread,
      findRetakeRequests,
      closeRetakeRequest,
      notifyRetakeDeclined: (input) => notify({ kind: 'retake_declined', ...input }),
    }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'no_retake' ? '撮り直しのお願いは、もう終わっています' : '送れませんでした'
    )
  }
  revalidateThread(threadId)
  return actionSuccess('コーチに伝えました。いまの動画で添削が届きます')
}
