'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { revokeGrant } from '../application/usecases/revokeGrant.usecase'
import { findGrant, saveGrantRevoked } from '../infrastructure/repositories/campaignRepository'

/** 管理者がコーチの特典を取り消す。取り消すとキャンペーンの枠が空く */
export const revokeGrantAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  if (!(await isAdminRequest())) {
    return actionError('権限がありません')
  }
  const result = await revokeGrant(
    { grantId: formString(formData, 'grantId'), now: new Date() },
    { findGrant, saveGrantRevoked }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'already_revoked' ? 'すでに取り消しています' : '特典が見つかりません'
    )
  }
  revalidatePath('/admin')
  return actionSuccess('特典を取り消しました')
}
