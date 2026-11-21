'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { grantCampaignToCoach } from '@/server/features/campaign/public'
import { isDemoCoach } from '@/server/features/demo/public'
import { notify } from '@/server/features/notification/public'
import { lowerMonthlyPrices } from '@/server/features/purchase/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formChecked, formNumber, formString } from '@/server/utils/formData'
import { logError } from '@/server/utils/logger'
import type { ErrorOf } from '@/server/utils/result'
import { deleteAbsence } from '../application/usecases/deleteAbsence.usecase'
import { inviteCoach } from '../application/usecases/inviteCoach.usecase'
import { saveAbsence } from '../application/usecases/saveAbsence.usecase'
import { setCoachSuspended } from '../application/usecases/setCoachSuspended.usecase'
import { setDelayFlag } from '../application/usecases/setDelayFlag.usecase'
import { startPayoutOnboarding } from '../application/usecases/startPayoutOnboarding.usecase'
import { updateCoachProfile } from '../application/usecases/updateCoachProfile.usecase'
import { updatePlans } from '../application/usecases/updatePlans.usecase'
import { PLAN_MIN_PRICE_YEN } from '../domain/rules'
import { generateCoachSlug, RANDOM_SLUG_LENGTH } from '../domain/services/generateCoachSlug.service'
import { coachProfileSchema } from '../domain/values/Coach'
import { absenceInputSchema } from '../domain/values/CoachAbsence'
import { coachSlugSchema } from '../domain/values/CoachSlug'
import { planKindSchema, planSchema } from '../domain/values/Plan'
import {
  createConnectAccount,
  createDashboardLink,
  createOnboardingLink,
  syncConnectProfile,
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

/** スラッグの入力。空なら null（ランダムな文字列にする） */
const optionalSlugSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .pipe(coachSlugSchema.nullable())

/** 自動で決めるスラッグ（乱数は Web Crypto から） */
const generateSlug = () =>
  generateCoachSlug(crypto.getRandomValues(new Uint8Array(RANDOM_SLUG_LENGTH)))

const inviteInputSchema = z.object({
  // コピーで前後に空白が入っても通す（大文字・小文字は保存と検索のときにそろえる）
  email: z.string().trim().pipe(z.email('メールアドレスの形が正しくありません')),
  name: z.string().trim().min(1, '名前を入れてください').max(50),
  slug: optionalSlugSchema,
  /** 付けるキャンペーン（任意。空なら付けない） */
  campaignCode: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value)),
})

const GRANT_ERROR_MESSAGE = {
  campaign_not_found: 'キャンペーンが見つかりません',
  campaign_inactive: 'キャンペーンは終了しています',
  already_granted: 'このコーチにはすでに付いています',
  limit_reached: 'キャンペーンの枠がいっぱいです',
} as const satisfies Record<ErrorOf<typeof grantCampaignToCoach>, string>

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
    campaignCode: formString(formData, 'campaignCode'),
  })
  if (!input.success) {
    return actionError(firstIssue(input.error))
  }

  const result = await inviteCoach(input.data, {
    findUserByEmail,
    isSlugTaken,
    saveInvitedCoach,
    generateId: () => crypto.randomUUID(),
    generateSlug,
    notifyCoachInvited: (input) => notify({ kind: 'coach_invited', ...input }),
  })
  if (!result.ok) {
    return actionError(
      result.error === 'already_coach'
        ? 'このメールアドレスはすでにコーチです'
        : result.error === 'slug_taken'
          ? 'この受付ページのURLはほかのコーチが使っています'
          : 'URLを自動で決められませんでした。もう一度お試しください'
    )
  }
  revalidatePath('/admin')
  const invited = `${input.data.name} さんを招待し、ログインの案内をメールで送りました`
  if (input.data.campaignCode === null) {
    return actionSuccess(invited)
  }
  const granted = await grantCampaignToCoach(result.value.userId, input.data.campaignCode)
  if (!granted.ok) {
    return actionError(
      `${invited}。ただし特典は付けられませんでした（${GRANT_ERROR_MESSAGE[granted.error]}）`
    )
  }
  return actionSuccess(`${invited}（特典も付けました）`)
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
  const input = coachProfileSchema.extend({ slug: optionalSlugSchema }).safeParse({
    slug: formString(formData, 'slug'),
    name: formString(formData, 'name'),
    title: formString(formData, 'title'),
    bio: formString(formData, 'bio'),
    instagram: formString(formData, 'instagram'),
    licenses: formData.getAll('licenses').filter((v): v is string => typeof v === 'string'),
    licenseOther: formString(formData, 'licenseOther'),
    monthlyCapacity: formNumber(formData, 'monthlyCapacity'),
  })
  if (!input.success) {
    return actionError(firstIssue(input.error))
  }

  const result = await updateCoachProfile(
    { actor, profile: input.data },
    {
      findCoachSlug,
      isSlugTaken,
      saveCoachProfile,
      generateSlug,
      findStripeAccountId,
      syncConnectProfile,
    }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'slug_taken'
        ? 'このURLはほかのコーチが使っています'
        : result.error === 'slug_unavailable'
          ? 'URLを自動で決められませんでした。もう一度お試しください'
          : 'コーチとして登録されていません'
    )
  }
  revalidatePath('/coach/settings')
  return actionSuccess('プロフィールを保存しました')
}

const yen = (value: number) => `${value.toLocaleString('ja-JP')}円`

const PLANS_ERROR = {
  not_found: 'コーチとして登録されていません',
  duplicate_kind: 'プランの種類が重なっています',
  below_minimum: `価格は、お試し${yen(PLAN_MIN_PRICE_YEN.trial)}・1レッスン${yen(PLAN_MIN_PRICE_YEN.single)}・月額${yen(PLAN_MIN_PRICE_YEN.monthly)}以上にしてください`,
} as const satisfies Record<ErrorOf<typeof updatePlans>, string>

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
      price: formNumber(formData, `${kind}.price`),
      active: formChecked(formData, `${kind}.active`),
    }))
  )
  if (!plans.success) {
    return actionError(firstIssue(plans.error))
  }

  const result = await updatePlans({ actor, plans: plans.data }, { isCoach, savePlans })
  if (!result.ok) {
    return actionError(PLANS_ERROR[result.error])
  }
  revalidatePath('/coach/settings')
  const monthly = plans.data.find((plan) => plan.kind === 'monthly')
  const lowered = monthly ? await lowerMonthlyPrices(actor.userId, monthly.price) : null
  if (lowered?.ok && lowered.value.failed > 0) {
    return actionError(
      `プランは保存しましたが、月額の生徒${lowered.value.failed}人の値下げを反映できませんでした。時間をおいてもう一度保存してください`
    )
  }
  return actionSuccess(
    lowered?.ok && lowered.value.lowered > 0
      ? `プランを保存しました。月額を続けている${lowered.value.lowered}人も、次の請求から新しい価格になります`
      : 'プランを保存しました'
  )
}

/** Stripe との通信が失敗したとき、コーチに出す文言 */
const PAYOUT_STRIPE_ERROR_MESSAGE =
  'Stripe とつながりませんでした。少し時間をおいて、もう一度お試しください。続くときは運営にお問い合わせください'

/** 売上を受け取る口座の設定（Stripe）へ進む */
export const startPayoutOnboardingAction = async (
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/coach/login')
  }
  let result: Awaited<ReturnType<typeof startPayoutOnboarding>>
  try {
    result = await startPayoutOnboarding(
      { actor },
      {
        findPayoutAccount,
        createConnectAccount,
        saveStripeAccountId,
        createOnboardingLink,
        isDemoCoach,
      }
    )
  } catch (error) {
    // Stripe の設定不足（本番の有効化前など）もここに来る。中身はログで確かめる
    logError('stripe', '口座の設定を始められませんでした', error, { ids: { userId: actor.userId } })
    return actionError(PAYOUT_STRIPE_ERROR_MESSAGE)
  }
  if (!result.ok) {
    if (result.error === 'demo_coach') {
      return actionError('デモでは口座を登録できません。正式に登録したあとに設定できます')
    }
    redirect('/coach')
  }
  redirect(result.value.url)
}

/** 売上・入金を確かめる Stripe の画面へ */
export const openPayoutDashboardAction = async (
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) {
    redirect('/coach/login')
  }
  const accountId = await findStripeAccountId(actor.userId)
  if (accountId === null) {
    redirect('/coach/settings')
  }
  let url: string
  try {
    url = await createDashboardLink(accountId)
  } catch (error) {
    logError('stripe', '売上の画面を開けませんでした', error, { ids: { userId: actor.userId } })
    return actionError(PAYOUT_STRIPE_ERROR_MESSAGE)
  }
  redirect(url)
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
} as const satisfies Record<ErrorOf<typeof saveAbsence> | ErrorOf<typeof deleteAbsence>, string>

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
