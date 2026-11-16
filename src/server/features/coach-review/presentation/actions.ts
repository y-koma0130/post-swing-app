'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { replyToCoachReview } from '../application/usecases/replyToCoachReview.usecase'
import { submitCoachReview } from '../application/usecases/submitCoachReview.usecase'
import { coachReviewInputSchema, coachReviewReplySchema } from '../domain/values/CoachReview'
import {
  findReviewByThread,
  findThreadForReview,
  saveReview,
  saveReviewReply,
} from '../infrastructure/repositories/coachReviewRepository'

export const submitCoachReviewAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const input = coachReviewInputSchema.safeParse({
    rating: Number(formString(formData, 'rating')),
    comment: formString(formData, 'comment'),
  })
  if (!input.success) {
    return actionError(input.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const result = await submitCoachReview(
    { actor, threadId, review: input.data, now: new Date() },
    { findThreadForReview, saveReview, generateId: () => crypto.randomUUID() }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'already_reviewed'
        ? 'レビューはもう書いています'
        : 'スレッドが終わってから書けます'
    )
  }
  revalidatePath(`/t/${threadId}`)
  return actionSuccess('レビューを送りました。ありがとうございます')
}

export const replyToCoachReviewAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const reply = coachReviewReplySchema.safeParse(formString(formData, 'reply'))
  if (!reply.success) {
    return actionError(reply.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const result = await replyToCoachReview(
    { actor, threadId, reply: reply.data, now: new Date() },
    { findReviewByThread, saveReviewReply }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'already_replied' ? '返信はもうしています' : '見つかりません'
    )
  }
  revalidatePath(`/coach/threads/${threadId}`)
  return actionSuccess('返信しました')
}
