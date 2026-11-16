'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getActor } from '@/server/auth/getActor'
import { planKindSchema } from '@/server/features/coach/domain/values/Plan'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { joinWaitlist } from '../application/usecases/joinWaitlist.usecase'
import {
  type StartCheckoutError,
  startCheckout,
} from '../application/usecases/startCheckout.usecase'
import { createBillingPortalSession } from '../infrastructure/external-services/createBillingPortalSession'
import { createCheckoutSession } from '../infrastructure/external-services/createCheckoutSession'
import {
  attachCheckoutSession,
  countActiveThreads,
  findCoachForCheckout,
  findCoachUserIdBySlug,
  findPortalCustomer,
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
