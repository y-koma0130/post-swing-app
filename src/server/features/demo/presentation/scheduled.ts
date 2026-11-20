import 'server-only'
import { deleteMediaObject } from '@/server/utils/mediaStorage'
import { deleteDemoCoach } from '../application/usecases/deleteDemoCoach.usecase'
import { deleteExpiredDemos } from '../application/usecases/deleteExpiredDemos.usecase'
import {
  deleteDemoCoachData,
  findExpiredDemoCoaches,
} from '../infrastructure/repositories/demoRepository'

/** 毎日の処理：期限を過ぎたデモを、データごと消す */
export const runDailyDemoCleanup = async (now: Date) => {
  const result = await deleteExpiredDemos(
    { now },
    {
      findExpiredDemoCoaches,
      deleteDemoCoach: (coachUserId) =>
        deleteDemoCoach({ coachUserId }, { deleteDemoCoachData, deleteMediaObject }),
    }
  )
  if (result.ok && result.value.deleted > 0) console.info('[scheduled] デモ', result.value)
}
