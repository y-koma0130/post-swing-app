'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { formString } from '@/server/utils/formData'
import { deleteMediaObject } from '@/server/utils/mediaStorage'
import { createDemoCoach } from '../application/usecases/createDemoCoach.usecase'
import { deleteDemoCoach } from '../application/usecases/deleteDemoCoach.usecase'
import { reissueDemoLink } from '../application/usecases/reissueDemoLink.usecase'
import { buildDemoSeed } from '../infrastructure/repositories/buildDemoSeed'
import {
  deleteDemoCoachData,
  saveDemoSeed,
  saveDemoTokenHash,
} from '../infrastructure/repositories/demoRepository'
import type { DemoActionState } from './demoActionState'
import {
  generateDemoMonitorCode,
  generateDemoSlug,
  generateDemoToken,
  hashDemoToken,
  isDemoEnabled,
} from './demoEnv'
import { demoLoginUrl } from './demoLink'

const NOT_ENABLED = 'デモは staging でだけ作れます'

/** デモのコーチを作る（管理者だけ）。作ったら、デモ用のリンクを返す */
export const createDemoCoachAction = async (
  _prev: DemoActionState,
  formData: FormData
): Promise<DemoActionState> => {
  if (!(await isAdminRequest())) return { status: 'error', message: '権限がありません' }
  const result = await createDemoCoach(
    { name: formString(formData, 'name'), now: new Date() },
    {
      isDemoEnabled: isDemoEnabled(),
      generateId: () => crypto.randomUUID(),
      generateToken: generateDemoToken,
      hashToken: hashDemoToken,
      generateSlug: generateDemoSlug,
      generateMonitorCode: generateDemoMonitorCode,
      saveDemoCoach: (demo) =>
        saveDemoSeed(buildDemoSeed({ ...demo, newId: () => crypto.randomUUID() })),
    }
  )
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error === 'not_enabled' ? NOT_ENABLED : '名前を30文字までで入れてください',
    }
  }
  revalidatePath('/admin')
  return {
    status: 'link',
    message: 'デモを作りました。このリンクをコーチ候補に送ってください（あとからは表示できません）',
    url: demoLoginUrl(result.value.token),
  }
}

/** デモ用のリンクを作り直す（前のリンクは使えなくなる） */
export const reissueDemoLinkAction = async (
  _prev: DemoActionState,
  formData: FormData
): Promise<DemoActionState> => {
  if (!(await isAdminRequest())) return { status: 'error', message: '権限がありません' }
  const result = await reissueDemoLink(
    { coachUserId: formString(formData, 'coachUserId') },
    {
      isDemoEnabled: isDemoEnabled(),
      generateToken: generateDemoToken,
      hashToken: hashDemoToken,
      saveDemoTokenHash,
    }
  )
  if (!result.ok) {
    return {
      status: 'error',
      message: result.error === 'not_enabled' ? NOT_ENABLED : 'デモが見つかりません',
    }
  }
  return {
    status: 'link',
    message: '新しいリンクを作りました。前のリンクは使えなくなりました',
    url: demoLoginUrl(result.value.token),
  }
}

/** デモを、データごと消す（管理者だけ） */
export const deleteDemoCoachAction = async (
  _prev: DemoActionState,
  formData: FormData
): Promise<DemoActionState> => {
  if (!(await isAdminRequest())) return { status: 'error', message: '権限がありません' }
  const result = await deleteDemoCoach(
    { coachUserId: formString(formData, 'coachUserId') },
    { deleteDemoCoachData, deleteMediaObject }
  )
  if (!result.ok) return { status: 'error', message: 'デモが見つかりません' }
  revalidatePath('/admin')
  return { status: 'success', message: 'デモを消しました' }
}
