'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { isCoach } from '@/server/features/coach/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { createDrill } from '../application/usecases/createDrill.usecase'
import { deleteDrill } from '../application/usecases/deleteDrill.usecase'
import { drillInputSchema } from '../domain/values/Drill'
import {
  findDrillOwner,
  isUnusedOwnDrillVideo,
  deleteDrill as removeDrill,
  saveDrill,
} from '../infrastructure/repositories/drillRepository'

export const createDrillAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const input = drillInputSchema.safeParse({
    title: formString(formData, 'title'),
    description: formString(formData, 'description'),
    videoId: formString(formData, 'videoId'),
  })
  if (!input.success) {
    return actionError(input.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const result = await createDrill(
    { actor, drill: input.data },
    { isCoach, isUnusedOwnDrillVideo, saveDrill, generateId: () => crypto.randomUUID() }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'invalid_video'
        ? 'お手本の動画が見つかりません。動画を選び直してください'
        : 'コーチとして登録されていません'
    )
  }
  revalidatePath('/coach/drills')
  return actionSuccess('ドリルを登録しました')
}

export const deleteDrillAction = async (formData: FormData): Promise<void> => {
  const actor = await getActor()
  if (!actor) return
  await deleteDrill(
    { actor, drillId: formString(formData, 'drillId') },
    { findDrillOwner, deleteDrill: removeDrill }
  )
  revalidatePath('/coach/drills')
}
