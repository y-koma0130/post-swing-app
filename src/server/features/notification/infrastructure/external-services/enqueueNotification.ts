import 'server-only'
import { env } from 'cloudflare:workers'
import { isActivity, NOTIFICATION_RULES } from '../../domain/rules'
import type { NotificationMessage } from '../../domain/values/NotificationMessage'

export type EnqueueNotification = (message: NotificationMessage) => Promise<void>

/**
 * 通知をキューに積む。送るのは queue の consumer（失敗したら Queues が再送する）。
 * やりとりの通知は少し遅らせて積み、届いた時点でまとめるか判定する
 */
export const enqueueNotification: EnqueueNotification = async (message) => {
  await env.NOTIFICATIONS.send(
    message,
    isActivity(message) ? { delaySeconds: NOTIFICATION_RULES.activityDelaySeconds } : {}
  )
}
