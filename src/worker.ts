import vinext from 'vinext/server/fetch-handler'
import { applyDevMigrations } from './server/db/applyDevMigrations'
import { runDailyDrillVideoCleanup } from './server/features/drill/presentation/scheduled'
import { handleNotificationBatch } from './server/features/notification/presentation/handleNotificationBatch'
import {
  runDailyFeeAdjustmentSummary,
  runDailyWaitlistNotification,
} from './server/features/purchase/presentation/scheduled'
import {
  runAbsenceEndedNotification,
  runDailyThreadMaintenance,
} from './server/features/thread/presentation/scheduled'

/** cloudflare.config.ts の定期処理と同じ値 */
const MORNING_CRON = '0 0 * * *'

/**
 * Worker の入口。画面と API は vinext に任せ、キュー（通知）と定期処理（毎日）をここで足す
 */
/** 毎日の処理を1つ動かす。失敗してもほかの処理を止めない */
const runJob = async (label: string, run: () => Promise<void>) => {
  try {
    await run()
  } catch (error) {
    console.error(`[scheduled] ${label}の処理に失敗しました`, error)
  }
}

export default {
  ...vinext,
  fetch: async (request, env, ctx) => {
    if (import.meta.env.DEV) {
      await applyDevMigrations(env.DB)
    }
    return vinext.fetch(request, env, ctx)
  },
  queue: async (batch) => {
    await handleNotificationBatch(batch)
  },
  scheduled: async (controller) => {
    const now = new Date(controller.scheduledTime)
    // 朝（日本時間9時）は、不在明けのお知らせだけ
    if (controller.cron === MORNING_CRON) {
      await runAbsenceEndedNotification(now)
      return
    }
    // レッスンを終了してから、空いた枠をキャンセル待ちに知らせる（順に動かす）。
    // 1つが失敗しても、ほかは動かす（ログに残し、翌日にもう一度）
    await runJob('レッスン', () => runDailyThreadMaintenance(now))
    await runJob('キャンセル待ち', () => runDailyWaitlistNotification(now))
    await runJob('手数料の差額', () => runDailyFeeAdjustmentSummary(now))
    await runJob('ドリルの動画', () => runDailyDrillVideoCleanup(now))
  },
} satisfies ExportedHandler<Env>
