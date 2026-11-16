import { ok, type Result } from '@/server/utils/result'
import {
  composeNotification,
  type NotificationContext,
} from '../../domain/services/composeNotification.service'
import type { NotificationMessage } from '../../domain/values/NotificationMessage'

export type SkipReason = 'context_not_found' | 'no_line_account' | 'not_line_friend' | 'no_email'

type Dependencies = Readonly<{
  findContext: (message: NotificationMessage) => Promise<Omit<NotificationContext, 'appUrl'> | null>
  findLineRecipient: (userId: string) => Promise<{ lineUserId: string; isFriend: boolean } | null>
  /** 送れるメールアドレス（LINE の仮のアドレスは null） */
  findEmail: (userId: string) => Promise<string | null>
  sendLinePush: (lineUserId: string, text: string) => Promise<void>
  sendEmail: (input: { to: string; subject: string; text: string }) => Promise<void>
  appUrl: string
}>

export type DeliverNotification = (
  message: NotificationMessage,
  dependencies: Dependencies
) => Promise<Result<{ sent: true } | { sent: false; reason: SkipReason }, never>>

/**
 * キューから取り出した通知を送る（queue の consumer から呼ぶ）
 *
 * 送れない相手（LINE の友だちでない、メールがない）は飛ばす。送信の失敗は例外のまま投げ、
 * Queues に再送させる
 */
export const deliverNotification: DeliverNotification = async (message, deps) => {
  const ctx = await deps.findContext(message)
  if (!ctx) {
    return ok({ sent: false, reason: 'context_not_found' })
  }
  const notification = composeNotification(message, { ...ctx, appUrl: deps.appUrl })

  if (notification.channel === 'line') {
    const line = await deps.findLineRecipient(notification.recipientUserId)
    if (!line) return ok({ sent: false, reason: 'no_line_account' })
    if (!line.isFriend) return ok({ sent: false, reason: 'not_line_friend' })
    await deps.sendLinePush(line.lineUserId, notification.text)
    return ok({ sent: true })
  }

  const email = await deps.findEmail(notification.recipientUserId)
  if (!email) return ok({ sent: false, reason: 'no_email' })
  await deps.sendEmail({ to: email, subject: notification.subject, text: notification.text })
  return ok({ sent: true })
}
