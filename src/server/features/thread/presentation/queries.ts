import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { isAdminRequest } from '@/server/auth/isAdminRequest'
import { startOfLocalMonth } from '@/server/utils/localDate'
import { viewThread } from '../application/usecases/viewThread.usecase'
import { countLessonsForAdmin } from '../infrastructure/query-services/countLessonsForAdmin'
import { findThreadDetail } from '../infrastructure/query-services/findThreadDetail'
import {
  listCoachThreadSummaries,
  listStudentThreadSummaries,
} from '../infrastructure/query-services/listThreadSummaries'
import { listThreadsForAdmin } from '../infrastructure/query-services/listThreadsForAdmin'

/** 生徒が自分のスレッドを見る。本人でなければ null */
export const getStudentThread = async (threadId: string) => {
  const actor = await getActor()
  if (!actor) return null
  const result = await viewThread({ actor, threadId, as: 'student' }, { findThreadDetail })
  return result.ok ? result.value : null
}

/** コーチが担当のスレッドを見る。担当でなければ null */
export const getCoachThread = async (threadId: string) => {
  const actor = await getActor()
  if (!actor) return null
  const result = await viewThread({ actor, threadId, as: 'coach' }, { findThreadDetail })
  return result.ok ? result.value : null
}

/**
 * コーチのホームの一覧（コーチであることは呼び出し側で確かめる）。
 * 終わったレッスンは finishedLimit 件まで（「もっと見る」で増やす）
 */
export const getCoachThreadSummaries = (coachUserId: string, finishedLimit: number) =>
  listCoachThreadSummaries(coachUserId, finishedLimit)

/**
 * 生徒のマイページの一覧。ログインしていなければ null。
 * coachSlug を渡すと、そのコーチとのレッスンだけ（コーチ詳細ページ）
 */
export const getMyThreadSummaries = async (
  options: Readonly<{ finishedLimit: number; coachSlug?: string | undefined }>
) => {
  const actor = await getActor()
  return actor ? listStudentThreadSummaries(actor.userId, options) : null
}

/** 管理画面のスレッド一覧。管理者でなければ null */
export const getThreadsForAdmin = async () => {
  if (!(await isAdminRequest())) return null
  return listThreadsForAdmin()
}

/** 管理画面のレッスンと生徒の数（今月は日本時間の月）。管理者でなければ null */
export const getLessonStatsForAdmin = async () => {
  if (!(await isAdminRequest())) return null
  return countLessonsForAdmin(startOfLocalMonth(new Date()))
}
