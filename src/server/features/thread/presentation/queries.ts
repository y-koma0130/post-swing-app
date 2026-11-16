import 'server-only'
import { getActor } from '@/server/auth/getActor'
import { viewThread } from '../application/usecases/viewThread.usecase'
import { findThreadDetail } from '../infrastructure/query-services/findThreadDetail'
import {
  listCoachThreadSummaries,
  listStudentThreadSummaries,
} from '../infrastructure/query-services/listThreadSummaries'

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

/** コーチのホームの一覧（コーチであることは呼び出し側で確かめる） */
export const getCoachThreadSummaries = (coachUserId: string) =>
  listCoachThreadSummaries(coachUserId)

/** 生徒のマイページの一覧。ログインしていなければ null */
export const getMyThreadSummaries = async () => {
  const actor = await getActor()
  return actor ? listStudentThreadSummaries(actor.userId) : null
}
