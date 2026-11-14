'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import { inviteCoach } from '../application/usecases/inviteCoach.usecase'
import { startPayoutOnboarding } from '../application/usecases/startPayoutOnboarding.usecase'
import { updateCoachProfile } from '../application/usecases/updateCoachProfile.usecase'
import { updatePlans } from '../application/usecases/updatePlans.usecase'
import { coachProfileSchema } from '../domain/values/Coach'
import { coachSlugSchema } from '../domain/values/CoachSlug'
import { planKindSchema, planSchema } from '../domain/values/Plan'
import {
  createConnectAccount,
  createDashboardLink,
  createOnboardingLink,
} from '../infrastructure/external-services/stripeConnect'
import {
  findCoachSlug,
  findPayoutAccount,
  findStripeAccountId,
  findUserByEmail,
  isCoach,
  isSlugTaken,
  saveCoachProfile,
  saveInvitedCoach,
  savePlans,
  saveStripeAccountId,
} from '../infrastructure/repositories/coachRepository'

/** zod のエラーから、最初のメッセージだけを画面に出す */
const firstIssue = (error: z.ZodError): string =>
  error.issues[0]?.message ?? '入力を確かめてください'

const inviteInputSchema = z.object({
  email: z.email('メールアドレスの形が正しくありません'),
  name: z.string().trim().min(1, '名前を入れてください').max(50),
  slug: coachSlugSchema,
})

/** 管理者がコーチを招待する */
export const inviteCoachAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  if (!(await isAdminRequest())) {
    return actionError('権限がありません')
  }
  const input = inviteInputSchema.safeParse({
    email: formString(formData, 'email'),
    name: formString(formData, 'name'),
    slug: formString(formData, 'slug'),
  })
  if (!input.success) {
    return actionError(firstIssue(input.error))
  }

  const result = await inviteCoach(input.data, {
    findUserByEmail,
    isSlugTaken,
    saveInvitedCoach,
    generateId: () => crypto.randomUUID(),
  })
  if (!result.ok) {
    return actionError(
      result.error === 'already_coach'
        ? 'このメールアドレスはすでにコーチです'
        : 'このスラッグはほかのコーチが使っています'
    )
  }
  revalidatePath('/admin')
  return actionSuccess(`${input.data.name} さんを招待しました。メールのコードでログインできます`)
}

/** コーチが自分のプロフィールを保存する */
export const updateCoachProfileAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const input = coachProfileSchema.safeParse({
    slug: formString(formData, 'slug'),
    name: formString(formData, 'name'),
    title: formString(formData, 'title'),
    bio: formString(formData, 'bio'),
    instagram: formString(formData, 'instagram'),
    monthlyCapacity: Number(formString(formData, 'monthlyCapacity')),
  })
  if (!input.success) {
    return actionError(firstIssue(input.error))
  }

  const result = await updateCoachProfile(
    { actor, profile: input.data },
    { findCoachSlug, isSlugTaken, saveCoachProfile }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'slug_taken'
        ? 'このURLはほかのコーチが使っています'
        : 'コーチとして登録されていません'
    )
  }
  revalidatePath('/coach/settings')
  return actionSuccess('プロフィールを保存しました')
}

/** コーチが自分のプランを保存する。フォームは種類ごとに `<kind>.price` のような名前で送る */
export const updatePlansAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const plans = z.array(planSchema).safeParse(
    planKindSchema.options.map((kind) => ({
      kind,
      name: formString(formData, `${kind}.name`),
      price: Number(formString(formData, `${kind}.price`)),
      description: formString(formData, `${kind}.description`),
      active: formChecked(formData, `${kind}.active`),
    }))
  )
  if (!plans.success) {
    return actionError(firstIssue(plans.error))
  }

  const result = await updatePlans({ actor, plans: plans.data }, { isCoach, savePlans })
  if (!result.ok) {
    return actionError('コーチとして登録されていません')
  }
  revalidatePath('/coach/settings')
  return actionSuccess('プランを保存しました')
}

/** 売上を受け取る口座の設定（Stripe）へ進む */
export const startPayoutOnboardingAction = async (): Promise<void> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/coach/login')
  }
  const result = await startPayoutOnboarding(
    { actor },
    { findPayoutAccount, createConnectAccount, saveStripeAccountId, createOnboardingLink }
  )
  if (!result.ok) {
    redirect('/coach')
  }
  redirect(result.value.url)
}

/** 売上・入金を確かめる Stripe の画面へ */
export const openPayoutDashboardAction = async (): Promise<void> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/coach/login')
  }
  const accountId = await findStripeAccountId(actor.userId)
  if (accountId === null) {
    redirect('/coach/settings')
  }
  redirect(await createDashboardLink(accountId))
}
