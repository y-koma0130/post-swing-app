'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { isCoach } from '@/server/features/coach/infrastructure/repositories/coachRepository'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { createDrill } from '../application/usecases/createDrill.usecase'
import { deleteDrill } from '../application/usecases/deleteDrill.usecase'
import { drillInputSchema } from '../domain/values/Drill'
import {
  findDrillOwner,
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
  })
  if (!input.success) {
    return actionError(input.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const result = await createDrill(
    { actor, drill: input.data },
    { isCoach, saveDrill, generateId: () => crypto.randomUUID() }
  )
  if (!result.ok) return actionError('コーチとして登録されていません')
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
