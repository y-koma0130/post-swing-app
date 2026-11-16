import vinext from 'vinext/server/fetch-handler'
import { applyDevMigrations } from './server/db/applyDevMigrations'
import { handleNotificationBatch } from './server/features/notification/presentation/handleNotificationBatch'
import { runDailyWaitlistNotification } from './server/features/purchase/presentation/scheduled'
import { runDailyThreadMaintenance } from './server/features/thread/presentation/scheduled'

/**
 * Worker の入口。画面と API は vinext に任せ、キュー（通知）と定期処理（毎日）をここで足す
 */
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
    // スレッドを終了してから、空いた枠をキャンセル待ちに知らせる
    await runDailyThreadMaintenance(now)
    await runDailyWaitlistNotification(now)
  },
} satisfies ExportedHandler<Env>
