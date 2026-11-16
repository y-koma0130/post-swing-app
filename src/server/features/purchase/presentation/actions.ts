'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { findThreadPayment, markThreadRefunded } from '@/server/features/thread/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { TURNSTILE_ACTIONS, verifyTurnstile } from '@/server/utils/turnstile'
import { joinWaitlist } from '../application/usecases/joinWaitlist.usecase'
import { refundThread } from '../application/usecases/refundThread.usecase'
import {
  type StartCheckoutError,
  startCheckout,
} from '../application/usecases/startCheckout.usecase'
import { createBillingPortalSession } from '../infrastructure/external-services/createBillingPortalSession'
import { createCheckoutSession } from '../infrastructure/external-services/createCheckoutSession'
import { refundStripePayment } from '../infrastructure/external-services/refundStripePayment'
import {
  attachCheckoutSession,
  countActiveThreads,
  findCoachForCheckout,
  findCoachUserIdBySlug,
  findPortalCustomer,
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
  full: '今月は満枠です。キャンセル待ちに登録できます',
  trial_used: 'お試しはすでに利用済みです',
  already_subscribed: 'すでに月額で申し込んでいます',
} as const satisfies Record<StartCheckoutError, string>

/** 申し込んで Stripe の支払い画面へ進む */
export const startCheckoutAction = async (
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
    return actionError('確認できませんでした。少し待ってから、もう一度「お支払いへ進む」を押してください')
  }

  const result = await startCheckout(
    { actor, coachSlug, planKind: planKind.data },
    {
      findCoachForCheckout,
      countActiveThreads,
      hasPaidTrial,
      hasActiveSubscription,
      savePendingPurchase,
      createCheckoutSession,
      attachCheckoutSession,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    return actionError(CHECKOUT_ERROR_MESSAGE[result.error])
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
export const openBillingPortalAction = async (formData: FormData): Promise<void> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/login?next=/me')
  }
  const customerId = await findPortalCustomer(formString(formData, 'purchaseId'), actor.userId)
  if (customerId === null) {
    redirect('/me')
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
      { findThreadPayment, findPurchaseForRefund, refundStripePayment, markThreadRefunded }
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
