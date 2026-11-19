'use server'

import 'server-only'
import { revalidatePath } from 'next/cache'
import { getActor } from '@/server/auth/getActor'
import { type ActionState, actionError, actionSuccess } from '@/server/utils/actionState'
import { formString } from '@/server/utils/formData'
import { addChartEntry } from '../application/usecases/addChartEntry.usecase'
import { deleteChartEntry } from '../application/usecases/deleteChartEntry.usecase'
import { type SaveChartError, saveChart } from '../application/usecases/saveChart.usecase'
import { STUDENT_CHART_RULES } from '../domain/rules'
import { findThreadPair, hasLessonWith } from '../infrastructure/query-services/studentChartQueries'
import {
  deleteEntry,
  findEntryOwner,
  saveEntry,
  saveChart as storeChart,
} from '../infrastructure/repositories/studentChartRepository'

/** カルテはコーチの画面のあちこち（生徒の一覧・カルテ・添削画面）に出るので、まとめて描き直す */
const revalidateCoach = () => revalidatePath('/coach', 'layout')

const SAVE_ERROR = {
  not_found: '生徒が見つかりません',
  invalid_memo: `メモは${STUDENT_CHART_RULES.maxMemoLength}文字までです`,
  invalid_tags: `タグは${STUDENT_CHART_RULES.maxTagLength}文字・${STUDENT_CHART_RULES.maxTags}個までです`,
} as const satisfies Record<SaveChartError, string>

/** カルテのメモを保存する（入力が止まったら自動で呼ぶ） */
export const saveChartMemoAction = async (
  studentUserId: string,
  memo: string
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const result = await saveChart(
    { actor, studentUserId, memo, now: new Date() },
    { hasLessonWith, saveChart: storeChart }
  )
  if (!result.ok) return actionError(SAVE_ERROR[result.error])
  return actionSuccess('保存しました')
}

/** カルテのタグを保存する */
export const saveChartTagsAction = async (
  studentUserId: string,
  tags: string[]
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const result = await saveChart(
    { actor, studentUserId, tags, now: new Date() },
    { hasLessonWith, saveChart: storeChart }
  )
  if (!result.ok) return actionError(SAVE_ERROR[result.error])
  revalidateCoach()
  return actionSuccess('保存しました')
}

/** カルテにレッスンの記録を足す */
export const addChartEntryAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const threadId = formString(formData, 'threadId')
  const result = await addChartEntry(
    {
      actor,
      studentUserId: formString(formData, 'studentUserId'),
      body: formString(formData, 'body'),
      threadId: threadId === '' ? null : threadId,
      now: new Date(),
    },
    { hasLessonWith, findThreadPair, saveEntry, generateId: () => crypto.randomUUID() }
  )
  if (!result.ok) {
    return actionError(
      result.error === 'invalid_body'
        ? `記録は1〜${STUDENT_CHART_RULES.maxEntryLength}文字で書いてください`
        : '生徒が見つかりません'
    )
  }
  revalidateCoach()
  return actionSuccess('記録しました')
}

/** カルテの記録を消す */
export const deleteChartEntryAction = async (
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> => {
  const actor = await getActor()
  if (!actor) return actionError('ログインし直してください')
  const result = await deleteChartEntry(
    { actor, entryId: formString(formData, 'entryId') },
    { findEntryOwner, deleteEntry }
  )
  if (!result.ok) return actionError('記録が見つかりません')
  revalidateCoach()
  return actionSuccess('消しました')
}
