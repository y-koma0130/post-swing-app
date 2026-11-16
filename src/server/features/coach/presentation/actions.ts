'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { notify } from '@/server/features/notification/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formString } from '@/server/utils/formData'
import { deleteAbsence } from '../application/usecases/deleteAbsence.usecase'
import { inviteCoach } from '../application/usecases/inviteCoach.usecase'
import { saveAbsence } from '../application/usecases/saveAbsence.usecase'
import { setCoachSuspended } from '../application/usecases/setCoachSuspended.usecase'
import { setDelayFlag } from '../application/usecases/setDelayFlag.usecase'
import { startPayoutOnboarding } from '../application/usecases/startPayoutOnboarding.usecase'
import { updateCoachProfile } from '../application/usecases/updateCoachProfile.usecase'
import { updatePlans } from '../application/usecases/updatePlans.usecase'
import { coachProfileSchema } from '../domain/values/Coach'
import { absenceInputSchema } from '../domain/values/CoachAbsence'
import { coachSlugSchema } from '../domain/values/CoachSlug'
import { planKindSchema, planSchema } from '../domain/values/Plan'
import {
  createConnectAccount,
  createDashboardLink,
  createOnboardingLink,
} from '../infrastructure/external-services/stripeConnect'
import {
  findAbsences,
  deleteAbsence as removeAbsence,
  saveDelayFlag,
  saveAbsence as storeAbsence,
} from '../infrastructure/repositories/absenceRepository'
import {
  findCoachSlug,
  findPayoutAccount,
  findStripeAccountId,
  findUserByEmail,
  isCoach,
  isSlugTaken,
  saveCoachProfile,
  saveCoachSuspended,
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
    notifyCoachInvited: (input) => notify({ kind: 'coach_invited', ...input }),
  })
  if (!result.ok) {
    return actionError(
      result.error === 'already_coach'
        ? 'このメールアドレスはすでにコーチです'
        : 'このスラッグはほかのコーチが使っています'
    )
  }
  revalidatePath('/admin')
  return actionSuccess(`${input.data.name} さんを招待し、ログインの案内をメールで送りました`)
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

/** 管理者がコーチの受付を止める・再開する */
export const setCoachSuspendedAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  if (!(await isAdminRequest())) {
    return actionError('権限がありません')
  }
  const suspended = formString(formData, 'suspended') === 'true'
  const result = await setCoachSuspended(
    { coachUserId: formString(formData, 'coachUserId'), suspended, now: new Date() },
    { isCoach, saveCoachSuspended }
  )
  if (!result.ok) {
    return actionError('コーチが見つかりません')
  }
  revalidatePath('/admin')
  return actionSuccess(suspended ? '受付を止めました' : '受付を再開しました')
}

const ABSENCE_ERROR_MESSAGE = {
  not_found: '不在期間が見つかりません',
  invalid_range: '開始日は終了日より前にしてください',
  past: '終わった期間は登録できません',
  overlap: 'ほかの不在期間と重なっています',
} as const

/** コーチが不在期間を追加・編集する */
export const saveAbsenceAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const input = absenceInputSchema.safeParse({
    startDate: formString(formData, 'startDate'),
    endDate: formString(formData, 'endDate'),
    note: formString(formData, 'note'),
    pauseNewSignups: formChecked(formData, 'pauseNewSignups'),
  })
  if (!input.success) {
    return actionError(firstIssue(input.error))
  }
  const absenceId = formString(formData, 'absenceId')
  const result = await saveAbsence(
    { actor, absenceId: absenceId === '' ? null : absenceId, input: input.data, now: new Date() },
    {
      isCoach,
      findAbsences,
      saveAbsence: storeAbsence,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    return actionError(ABSENCE_ERROR_MESSAGE[result.error])
  }
  revalidatePath('/coach', 'layout')
  return actionSuccess('不在期間を保存しました')
}

/** コーチが不在期間を消す */
export const deleteAbsenceAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const result = await deleteAbsence(
    { actor, absenceId: formString(formData, 'absenceId') },
    { findAbsences, deleteAbsence: removeAbsence }
  )
  if (!result.ok) {
    return actionError(ABSENCE_ERROR_MESSAGE[result.error])
  }
  revalidatePath('/coach', 'layout')
  return actionSuccess('不在期間を消しました')
}

/** コーチが返信遅れフラグを立てる・下ろす */
export const setDelayFlagAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    return actionError('ログインし直してください')
  }
  const on = formString(formData, 'on') === 'true'
  const result = await setDelayFlag({ actor, on, now: new Date() }, { isCoach, saveDelayFlag })
  if (!result.ok) {
    return actionError('コーチとして登録されていません')
  }
  revalidatePath('/coach', 'layout')
  return actionSuccess(on ? '返信遅れの表示をオンにしました' : '返信遅れの表示をオフにしました')
}
