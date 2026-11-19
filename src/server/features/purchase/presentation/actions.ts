'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { findCoachAvailability } from '@/server/features/coach/public'
import {
  createThread,
  findApplicationThread,
  findOpenApplication,
  findThreadPayment,
  markThreadRefunded,
} from '@/server/features/thread/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import { TURNSTILE_ACTIONS, verifyTurnstile } from '@/server/utils/turnstile'
import { joinWaitlist } from '../application/usecases/joinWaitlist.usecase'
import { refundThread } from '../application/usecases/refundThread.usecase'
import {
  type StartApplicationError,
  startApplication,
} from '../application/usecases/startApplication.usecase'
import {
  type StartApplicationCheckoutError,
  startApplicationCheckout,
} from '../application/usecases/startApplicationCheckout.usecase'
import { createBillingPortalSession } from '../infrastructure/external-services/createBillingPortalSession'
import { createCheckoutSession } from '../infrastructure/external-services/createCheckoutSession'
import { refundStripePayment } from '../infrastructure/external-services/refundStripePayment'
import { markPaymentRefunded } from '../infrastructure/repositories/paymentRepository'
import {
  attachCheckoutSession,
  countActiveThreads,
  findCoachForCheckout,
  findCoachForCheckoutByUserId,
  findCoachUserIdBySlug,
  findPortalCustomer,
  findPurchase,
  findPurchaseForRefund,
  hasActiveSubscription,
  hasPaidTrial,
  savePendingPurchase,
  saveWaitlistEntry,
} from '../infrastructure/repositories/purchaseRepository'

const CHECKOUT_ERROR_MESSAGE = {
  not_found: 'コーチが見つかりません',
  not_accepting: 'このプランはいま受け付けていません',
  own_coach: '自分には申し込めません',
  paused_for_absence: 'コーチが不在のため、いまは申し込みを受け付けていません',
  ack_required: '返信が遅れることを確かめて、チェックを入れてください',
  full: '今月は満枠です。キャンセル待ちに登録できます',
  trial_used: 'お試しはすでに利用済みです',
  already_subscribed: 'すでに月額で申し込んでいます',
} as const satisfies Record<StartApplicationError, string>

const APPLICATION_CHECKOUT_ERROR_MESSAGE = {
  ...CHECKOUT_ERROR_MESSAGE,
  not_found: '申し込みが見つかりません',
  not_draft: 'この申し込みは、すでにカードの登録が済んでいます',
  no_submission: '先に、悩みと動画を送ってください',
  full: '受付枠が埋まってしまいました。キャンセル待ちに登録できます',
} as const satisfies Record<StartApplicationCheckoutError, string>

/** プランを選んで申し込む（悩みと動画を送る下書きへ。請求はコーチが承認したとき） */
export const startApplicationAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const coachSlug = formString(formData, 'coachSlug')
  const actor = await getActor()
  if (!actor) {
    redirect(`/login?next=${encodeURIComponent(`/c/${coachSlug}/apply`)}`)
  }
  const planKind = planKindSchema.safeParse(formString(formData, 'planKind'))
  if (!planKind.success) {
    return actionError('プランを選んでください')
  }
  // ボットが申し込みと Stripe の支払い画面を大量に作れないようにする
  const human = await verifyTurnstile(formString(formData, 'cf-turnstile-response'), {
    action: TURNSTILE_ACTIONS.checkout,
    remoteIp: (await headers()).get('cf-connecting-ip'),
  })
  if (!human) {
    return actionError('確認できませんでした。少し待ってから、もう一度ボタンを押してください')
  }

  const application = await startApplication(
    {
      actor,
      coachSlug,
      planKind: planKind.data,
      acknowledgedDelay: formChecked(formData, 'acknowledgeDelay'),
      now: new Date(),
    },
    {
      findCoachForCheckout,
      countActiveThreads,
      hasPaidTrial,
      hasActiveSubscription,
      findCoachAvailability,
      findOpenApplication,
      savePendingPurchase,
      createThread,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!application.ok) {
    return actionError(CHECKOUT_ERROR_MESSAGE[application.error])
  }
  redirect(`/t/${application.value.threadId}`)
}

/** 悩みと動画を送った申し込みの、カードの登録（仮押さえ）へ進む */
export const startApplicationCheckoutAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const threadId = formString(formData, 'threadId')
  const actor = await getActor()
  if (!actor) {
    redirect(`/login?next=${encodeURIComponent(`/t/${threadId}`)}`)
  }
  const result = await startApplicationCheckout(
    { actor, threadId, now: new Date() },
    {
      findApplicationThread,
      findPurchase,
      findCoachForCheckoutByUserId,
      countActiveThreads,
      hasPaidTrial,
      hasActiveSubscription,
      findCoachAvailability,
      createCheckoutSession,
      attachCheckoutSession,
    }
  )
  if (!result.ok) {
    return actionError(APPLICATION_CHECKOUT_ERROR_MESSAGE[result.error])
  }
  redirect(result.value.url)
}

/** キャンセル待ちに登録する */
export const joinWaitlistAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const coachSlug = formString(formData, 'coachSlug')
  const actor = await getActor()
  if (!actor) {
    redirect(`/login?next=${encodeURIComponent(`/c/${coachSlug}/apply`)}`)
  }
  const result = await joinWaitlist(
    { actor, coachSlug },
    { findCoachUserIdBySlug, saveWaitlistEntry }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'own_coach' ? '自分には申し込めません' : 'コーチが見つかりません'
    )
  }
  revalidatePath(`/c/${coachSlug}/apply`)
  return actionSuccess('キャンセル待ちに登録しました。空きが出たら LINE でお知らせします')
}

/** 月額の解約・カード変更をする Stripe の画面へ */
export const openBillingPortalAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/login?next=/me')
  }
  const customerId = await findPortalCustomer(formString(formData, 'purchaseId'), actor.userId)
  if (customerId === null) {
    return actionError('このプランの解約・カードの変更はできません')
  }
  redirect(await createBillingPortalSession(customerId))
}

const REFUND_ERROR_MESSAGE = {
  not_found: 'スレッドが見つかりません',
  already_refunded: 'すでに返金しています',
  not_paid: '支払いが済んでいない申し込みです',
  no_stripe_payment: 'Stripe を通っていない支払いなので、返金できません',
} as const

/** 管理者がスレッドの支払いを返金し、スレッドを終了する */
export const refundThreadAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  if (!(await isAdminRequest())) {
    return actionError('権限がありません')
  }
  try {
    const result = await refundThread(
      { threadId: formString(formData, 'threadId'), now: new Date() },
      {
        findThreadPayment,
        findPurchaseForRefund,
        refundStripePayment,
        markThreadRefunded,
        markPaymentRefunded,
      }
    )
    if (!result.ok) {
      return actionError(REFUND_ERROR_MESSAGE[result.error])
    }
  } catch (error) {
    console.error('[refund] 返金に失敗しました', error)
    return actionError(
      'Stripe で返金できませんでした。Stripe のダッシュボードで状態を確かめてください'
    )
  }
  revalidatePath('/admin')
  return actionSuccess('返金し、スレッドを終了しました')
}
