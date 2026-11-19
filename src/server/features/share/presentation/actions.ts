'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import type { ErrorOf } from '@/server/utils/result'
import { changeShareConsent } from '../application/usecases/changeShareConsent.usecase'
import { parseShareConsentForm } from '../domain/values/ShareConsent'
import { findCoachUserIdBySlug } from '../infrastructure/query-services/coachBySlug'
import { findLatestAgeRange } from '../infrastructure/query-services/latestAgeRange'
import { saveShareConsent } from '../infrastructure/repositories/shareConsentRepository'

const CHANGE_ERROR = {
  not_found: 'コーチが見つかりません',
  not_adult: '18歳未満の方は、公開を許可できません',
} as const satisfies Record<ErrorOf<typeof changeShareConsent>, string>

/** 生徒が、あるコーチへの公開の許可を変える（マイページから） */
export const changeShareConsentAction = async (
  coachSlug: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const [actor, coachUserId] = await Promise.all([getActor(), findCoachUserIdBySlug(coachSlug)])
  if (!actor) return actionError('ログインし直してください')
  if (!coachUserId) return actionError(CHANGE_ERROR.not_found)
  const result = await changeShareConsent(
    {
      actor,
      coachUserId,
      choices: parseShareConsentForm({
        allowPublish: formString(formData, 'allowPublish'),
        showFace: formString(formData, 'showFace'),
        showAgeRange: formString(formData, 'showAgeRange'),
        showScore: formString(formData, 'showScore'),
      }),
      now: new Date(),
    },
    { findLatestAgeRange, saveShareConsent }
  )
  if (!result.ok) return actionError(CHANGE_ERROR[result.error])
  revalidatePath('/me', 'layout')
  return actionSuccess(
    result.value.allowPublish ? '公開の許可を保存しました' : '公開しない、に変えました'
  )
}
