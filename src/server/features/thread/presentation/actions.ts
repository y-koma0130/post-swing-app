'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { findCoachAvailabilityFacts } from '@/server/features/coach/public'
import { findOwnDrill } from '@/server/features/drill/public'
import { notify } from '@/server/features/notification/public'
import { capturePayment, voidPayment } from '@/server/features/purchase/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import {
  type ApproveApplicationError,
  approveApplication,
} from '../application/usecases/approveApplication.usecase'
import { closeThreadByStudent } from '../application/usecases/closeThreadByStudent.usecase'
import {
  type DeclineApplicationError,
  declineApplication,
} from '../application/usecases/declineApplication.usecase'
import {
  type SendChatMessageError,
  sendChatMessage,
} from '../application/usecases/sendChatMessage.usecase'
import {
  type SubmitSubmissionError,
  submitSubmission,
} from '../application/usecases/submitSubmission.usecase'
import type { ChatAttachmentRequest } from '../domain/services/checkChatAttachment.service'
import type { QuoteRequest } from '../domain/services/checkQuoteTarget.service'
import { quoteKindSchema } from '../domain/values/ChatMessage'
import { coachDeclineReasonSchema } from '../domain/values/DeclineReason'
import { closeThreads } from '../infrastructure/repositories/maintenanceRepository'
import {
  findDraftVideo,
  findDraftVideos,
  findThread,
  findThreadCards,
  findThreadPayment,
  saveAbsenceAck,
  saveApproval,
  saveChatMessage,
  saveDecline,
  saveSubmission,
  saveThreadNotice,
} from '../infrastructure/repositories/threadRepository'

const CHAT_ERROR = {
  not_found: '送れませんでした',
  closed: 'このスレッドは終了しています',
  not_started: '申し込みが受け付けられてから、チャットを送れます',
  empty: 'メッセージを書いてください',
  too_long: 'メッセージは1000文字までです',
  no_submission: '最初の動画を提出してから、チャットを送れます',
  limit_reached: 'このスレッドで送れるメッセージの上限に達しました',
  attachment_not_allowed: 'チャットではメッセージだけを送れます',
  invalid_drill: '選んだドリルが見つかりません',
  invalid_video: '動画をもう一度選び直してください',
  invalid_quote: '引用したものが見つかりません',
} as const satisfies Record<SendChatMessageError, string>

/** 添付（コーチだけ。ドリルか、先に上げておいた動画） */
const parseAttachment = (formData: FormData): ChatAttachmentRequest => {
  const drillId = formString(formData, 'drillId')
  const videoId = formString(formData, 'videoId')
  if (drillId !== '') return { kind: 'drill', drillId }
  if (videoId !== '') return { kind: 'video', videoId }
  return { kind: 'none' }
}

/** 引用（種類と、指した先の ID） */
const parseQuote = (formData: FormData): QuoteRequest | null => {
  const kind = quoteKindSchema.safeParse(formString(formData, 'quoteKind'))
  const targetId = formString(formData, 'quoteTargetId')
  return kind.success && targetId !== '' ? { kind: kind.data, targetId } : null
}

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
  const now = new Date()
  const result = await sendChatMessage(
    {
      actor,
      threadId,
      body: formString(formData, 'body'),
      attachment: parseAttachment(formData),
      quote: parseQuote(formData),
      hideAbsenceNoticeFromNow: formChecked(formData, 'hideAbsenceNotice'),
      now,
    },
    {
      findThread,
      findThreadCards,
      findOwnDrill,
      findDraftVideo,
      findCoachAvailabilityFacts,
      saveThreadNotice,
      saveAbsenceAck,
      saveChatMessage,
      notifyChatMessage: (input) =>
        notify({ kind: 'chat_message', ...input, occurredAt: now.toISOString() }),
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
  invalid_golf_profile: '平均スコアは50〜200の数字で入れてください',
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
  const now = new Date()
  const result = await submitSubmission(
    {
      actor,
      threadId,
      theme: formString(formData, 'theme'),
      note: formString(formData, 'note'),
      golfProfile: {
        roundFrequency: formString(formData, 'roundFrequency'),
        averageScore: formString(formData, 'averageScore'),
      },
      videoIds: formData.getAll('videoId').filter((v): v is string => typeof v === 'string'),
      now,
    },
    {
      findThread,
      findCoachAvailabilityFacts,
      findDraftVideos,
      saveSubmission,
      saveThreadNotice,
      notifySubmitted: (input) =>
        notify({ kind: 'video_submitted', ...input, occurredAt: now.toISOString() }),
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

const APPROVE_ERROR = {
  not_found: '申し込みが見つかりません',
  not_requested: 'この申し込みは、すでに受けるか決まっています',
  approval_expired: '返事の期限を過ぎたため、受けられません',
  capture_failed:
    '生徒のカードで支払いを確定できませんでした。時間をおいてもう一度試すか、お断りしてください',
} as const satisfies Record<ApproveApplicationError, string>

/** コーチが申し込みを受ける（生徒への請求が確定し、添削を始められる） */
export const approveApplicationAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const threadId = formString(formData, 'threadId')
  const result = await approveApplication(
    { actor, threadId, now: new Date() },
    {
      findThread,
      findThreadPayment,
      capturePayment,
      saveApproval,
      notifyApproved: (input) => notify({ kind: 'application_approved', ...input }),
    }
  )
  if (!result.ok) {
    return actionError(APPROVE_ERROR[result.error])
  }
  revalidatePath('/coach')
  revalidatePath(`/coach/threads/${threadId}`)
  revalidatePath(`/t/${threadId}`)
  return actionSuccess('申し込みを受けました。添削を始められます')
}

const DECLINE_ERROR = {
  not_found: '申し込みが見つかりません',
  not_requested: 'この申し込みは、すでに受けるか決まっています',
  approval_expired: '返事の期限を過ぎています',
  message_too_long: 'ひとことは200文字までです',
  void_failed: 'カードの仮押さえを外せませんでした。時間をおいてもう一度試してください',
} as const satisfies Record<DeclineApplicationError, string>

/** コーチが申し込みを断る（カードの仮押さえを外す。生徒には請求しない） */
export const declineApplicationAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const reason = coachDeclineReasonSchema.safeParse(formString(formData, 'reason'))
  if (!reason.success) {
    return actionError('理由を選んでください')
  }
  const threadId = formString(formData, 'threadId')
  const result = await declineApplication(
    {
      actor,
      threadId,
      reason: reason.data,
      message: formString(formData, 'message'),
      now: new Date(),
    },
    {
      findThread,
      findThreadPayment,
      voidPayment,
      saveDecline,
      notifyDeclined: (input) => notify({ kind: 'application_declined', ...input }),
    }
  )
  if (!result.ok) {
    return actionError(DECLINE_ERROR[result.error])
  }
  revalidatePath('/coach')
  revalidatePath(`/coach/threads/${threadId}`)
  revalidatePath(`/t/${threadId}`)
  return actionSuccess('申し込みをお断りしました。生徒には請求されません')
}

/** 生徒が自分でスレッドを終える（添削を待っている提出がないとき） */
export const closeThreadAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const threadId = formString(formData, 'threadId')
  const result = await closeThreadByStudent(
    { actor, threadId, now: new Date() },
    {
      findThread,
      closeThreads,
      notifyThreadClosed: (input) => notify({ kind: 'thread_closed', ...input }),
    }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'awaiting_reply'
        ? 'コーチの添削が届いてから終えられます'
        : 'このスレッドは終えられません'
    )
  }
  revalidatePath(`/t/${threadId}`)
  revalidatePath('/me')
  revalidatePath(`/coach/threads/${threadId}`)
  return actionSuccess('スレッドを終えました')
}
