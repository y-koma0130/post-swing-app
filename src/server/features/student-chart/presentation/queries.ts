import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isCoach } from '@/server/features/coach/public'
import { viewChartForThread } from '../application/usecases/viewChartForThread.usecase'
import { viewStudentChart } from '../application/usecases/viewStudentChart.usecase'
import {
  findStudentChart,
  findThreadPair,
  hasLessonWith,
  listStudents,
} from '../infrastructure/query-services/studentChartQueries'

/** ログイン中のコーチの生徒一覧。コーチでなければ null */
export const getMyStudents = async () => {
  const actor = await getActor()
  if (!actor || !(await isCoach(actor.userId))) return null
  return listStudents(actor.userId)
}

/** 生徒のカルテ。その生徒とレッスンがあったコーチ本人でなければ null */
export const getStudentChart = async (studentUserId: string) => {
  const actor = await getActor()
  if (!actor) return null
  const result = await viewStudentChart(
    { actor, studentUserId },
    { hasLessonWith, findStudentChart }
  )
  return result.ok ? result.value : null
}

/** 添削画面に出すカルテ。そのスレッドの担当のコーチでなければ null */
export const getChartForThread = async (threadId: string) => {
  const actor = await getActor()
  if (!actor) return null
  const result = await viewChartForThread({ actor, threadId }, { findThreadPair, findStudentChart })
  return result.ok ? result.value : null
}
