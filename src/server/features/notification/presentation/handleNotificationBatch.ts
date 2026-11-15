import 'server-only'
import { env } from 'cloudflare:workers'
import { deliverNotification } from '../application/usecases/deliverNotification.usecase'
import { notificationMessageSchema } from '../domain/values/NotificationMessage'
import { sendEmail } from '../infrastructure/external-services/sendEmail'
import { sendLinePush } from '../infrastructure/external-services/sendLinePush'
import {
  findDeliverableEmail,
  findNotificationContext,
} from '../infrastructure/repositories/notificationRepository'
import { findLineRecipientWithFriendship } from './lineRecipient'

/**
 * 通知のキューを受ける（Worker の queue ハンドラから呼ぶ）
 * 1通ずつ送り、失敗したものだけ再送させる
 */
export const handleNotificationBatch = async (batch: MessageBatch): Promise<void> => {
  for (const message of batch.messages) {
    const parsed = notificationMessageSchema.safeParse(message.body)
    if (!parsed.success) {
      // 形が違うものは何度送っても直らないので捨てる
      console.error('[notification] 形の違うメッセージを捨てました', message.id)
      message.ack()
      continue
    }
    try {
      const result = await deliverNotification(parsed.data, {
        findContext: findNotificationContext,
        findLineRecipient: findLineRecipientWithFriendship,
        findEmail: findDeliverableEmail,
        sendLinePush,
        sendEmail,
        appUrl: env.APP_URL,
      })
      if (result.ok && !result.value.sent) {
        console.info('[notification] 送らずに終えました', parsed.data.kind, result.value.reason)
      }
      message.ack()
    } catch (error) {
      console.error('[notification] 送信に失敗しました。再送します', parsed.data.kind, error)
      message.retry()
    }
  }
}
