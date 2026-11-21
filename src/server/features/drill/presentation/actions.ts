'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { isCoach } from '@/server/features/coach/public'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { type CreateDrillError, createDrill } from '../application/usecases/createDrill.usecase'
import { deleteDrill } from '../application/usecases/deleteDrill.usecase'
import { drillInputSchema } from '../domain/values/Drill'
import { checkYoutubeEmbed } from '../infrastructure/external-services/checkYoutubeEmbed'
import {
  findDrillOwner,
  isUnusedOwnDrillVideo,
  deleteDrill as removeDrill,
  saveDrill,
} from '../infrastructure/repositories/drillRepository'

const CREATE_DRILL_ERROR_MESSAGE = {
  not_found: 'コーチとして登録されていません',
  invalid_video: 'お手本の動画が見つかりません。動画を選び直してください',
  youtube_unavailable:
    'この YouTube の動画は再生できません。公開か限定公開になっているか、埋め込みを許可しているかを確かめてください',
} satisfies Record<CreateDrillError, string>

export const createDrillAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const input = drillInputSchema.safeParse({
    title: formString(formData, 'title'),
    description: formString(formData, 'description'),
    video:
      formString(formData, 'videoKind') === 'youtube'
        ? { kind: 'youtube', url: formString(formData, 'youtubeUrl') }
        : { kind: 'upload', videoId: formString(formData, 'videoId') },
  })
  if (!input.success) {
    return actionError(input.error.issues[0]?.message ?? '入力を確かめてください')
  }
  const result = await createDrill(
    { actor, drill: input.data },
    {
      isCoach,
      isUnusedOwnDrillVideo,
      checkYoutubeEmbed,
      saveDrill,
      generateId: () => crypto.randomUUID(),
    }
  )
  if (!result.ok) {
    return actionError(CREATE_DRILL_ERROR_MESSAGE[result.error])
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
