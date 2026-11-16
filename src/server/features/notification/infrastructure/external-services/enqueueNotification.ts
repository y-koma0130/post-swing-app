import 'server-only'
import { env } from 'cloudflare:workers'
import type { NotificationMessage } from '../../domain/values/NotificationMessage'

export type EnqueueNotification = (message: NotificationMessage) => Promise<void>

/** 通知をキューに積む。送るのは queue の consumer（失敗したら Queues が再送する） */
export const enqueueNotification: EnqueueNotification = async (message) => {
  await env.NOTIFICATIONS.send(message)
}
