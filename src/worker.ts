import vinext from 'vinext/server/fetch-handler'
import { applyDevMigrations } from './server/db/applyDevMigrations'

/**
 * Worker の入口。画面と API は vinext に任せ、キューと定期処理をここで足す
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
    console.log('[queue]', batch.queue, batch.messages.length)
    batch.ackAll()
  },
  scheduled: async (controller) => {
    console.log('[scheduled]', controller.cron)
  },
} satisfies ExportedHandler<Env>
