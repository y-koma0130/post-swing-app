import 'server-only'
import { notify } from '@/server/features/notification/public'
import { logInfo, logWarn } from '@/server/utils/logger'
import { notifyWaitlist } from '../application/usecases/notifyWaitlist.usecase'
import { summarizeFeeAdjustments } from '../infrastructure/repositories/paymentRepository'
import {
  findCoachesWithWaitlist,
  findWaitingStudents,
  markWaitlistNotified,
} from '../infrastructure/repositories/purchaseRepository'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 毎日の集計：この1日で、月額の請求の手数料の差額を戻した件数と額
 * （invoice.created が届かなかった印。0件でなければ Webhook の設定・届き方を確かめる）
 */
export const runDailyFeeAdjustmentSummary = async (now: Date) => {
  const summary = await summarizeFeeAdjustments(new Date(now.getTime() - DAY_MS))
  if (summary.count > 0) {
    logWarn('purchase', '手数料の差額を戻した請求があります。Webhook の届き方を確かめてください', {
      counts: summary,
    })
  } else {
    logInfo('purchase', '手数料の差額を戻した請求はありません')
  }
}

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
  if (result.ok) logInfo('purchase', 'キャンセル待ちに知らせました', { counts: result.value })
}
