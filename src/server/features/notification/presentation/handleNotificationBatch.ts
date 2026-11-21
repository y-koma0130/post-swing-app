import 'server-only'
import { env } from 'cloudflare:workers'
import { isDemoCoach } from '@/server/features/demo/public'
import { findThreadActivityFacts } from '@/server/features/thread/public'
import { logError, logInfo, logWarn } from '@/server/utils/logger'
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
 * 1通を届けようとする回数の上限（初回＋再送）。cloudflare.config.ts のキューの maxRetries（5）＋1。
 * 最後の回でも失敗したら、キューから消える前に運営に知らせる
 */
const MAX_ATTEMPTS = 6

/**
 * 通知のキューを受ける（Worker の queue ハンドラから呼ぶ）
 * 1通ずつ送り、失敗したものだけ再送させる
 */
export const handleNotificationBatch = async (batch: MessageBatch): Promise<void> => {
  for (const message of batch.messages) {
    const parsed = notificationMessageSchema.safeParse(message.body)
    if (!parsed.success) {
      // 形が違うものは何度送っても直らないので捨てる
      logError('notification', '形の違うメッセージを捨てました', parsed.error, {
        ids: { messageId: message.id },
      })
      message.ack()
      continue
    }
    try {
      const result = await deliverNotification(parsed.data, {
        findContext: findNotificationContext,
        findActivityFacts: findThreadActivityFacts,
        findLineRecipient: findLineRecipientWithFriendship,
        findEmail: findDeliverableEmail,
        sendLinePush,
        sendEmail,
        isDemoCoach,
        appUrl: env.APP_URL,
      })
      if (result.ok && !result.value.sent) {
        logInfo('notification', '送らずに終えました', {
          kind: `${parsed.data.kind}: ${result.value.reason}`,
        })
      }
      message.ack()
    } catch (error) {
      const fields = { ids: { messageId: message.id }, kind: parsed.data.kind }
      if (message.attempts >= MAX_ATTEMPTS) {
        logError('notification', '再送しても送れませんでした。この通知は届きません', error, fields)
        message.ack()
        continue
      }
      logWarn('notification', '送信に失敗しました。再送します', fields, error)
      message.retry()
    }
  }
}
