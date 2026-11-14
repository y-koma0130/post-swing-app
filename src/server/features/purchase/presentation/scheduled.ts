import 'server-only'
import { enqueueNotification } from '@/server/features/notification/infrastructure/external-services/enqueueNotification'
import { notifyWaitlist } from '../application/usecases/notifyWaitlist.usecase'
import {
  findCoachesWithOpenSlots,
  findWaitingStudents,
  markWaitlistNotified,
} from '../infrastructure/repositories/purchaseRepository'

/** 毎日の処理（キャンセル待ち）。スレッドの終了のあとに呼ぶ（空きが出ているかもしれないので） */
export const runDailyWaitlistNotification = async (now: Date) => {
  const result = await notifyWaitlist(
    { now },
    {
      findCoachesWithOpenSlots,
      findWaitingStudents,
      notifyWaitlistOpened: (input) => enqueueNotification({ kind: 'waitlist_opened', ...input }),
      markWaitlistNotified,
    }
  )
  if (result.ok) console.info('[scheduled] キャンセル待ち', result.value)
}
