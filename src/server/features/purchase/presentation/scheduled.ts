import 'server-only'
import { notify } from '@/server/features/notification/public'
import { notifyWaitlist } from '../application/usecases/notifyWaitlist.usecase'
import {
  findCoachesWithWaitlist,
  findWaitingStudents,
  markWaitlistNotified,
} from '../infrastructure/repositories/purchaseRepository'

/** 毎日の処理（キャンセル待ち）。スレッドの終了のあとに呼ぶ（空きが出ているかもしれないので） */
export const runDailyWaitlistNotification = async (now: Date) => {
  const result = await notifyWaitlist(
    { now },
    {
      findCoachesWithWaitlist,
      findWaitingStudents,
      notifyWaitlistOpened: (input) => notify({ kind: 'waitlist_opened', ...input }),
      markWaitlistNotified,
    }
  )
  if (result.ok) console.info('[scheduled] キャンセル待ち', result.value)
}
