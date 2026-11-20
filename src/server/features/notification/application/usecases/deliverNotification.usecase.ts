import { ok, type Result } from '@/server/utils/result'
import { type ActivityMessage, isActivity } from '../../domain/rules'
import {
  composeNotification,
  type NotificationContext,
} from '../../domain/services/composeNotification.service'
import {
  type ActivityFacts,
  type ActivitySkipReason,
  shouldDeliverActivity,
} from '../../domain/services/shouldDeliverActivity.service'
import type { NotificationMessage } from '../../domain/values/NotificationMessage'

/** やりとりの通知を受け取る側 */
const activityRecipient = (message: ActivityMessage): 'coach' | 'student' =>
  message.kind === 'chat_message' ? message.to : message.kind === 'reply_sent' ? 'student' : 'coach'

export type SkipReason =
  | 'context_not_found'
  | 'no_line_account'
  | 'not_line_friend'
  | 'no_email'
  /** デモのコーチ（staging でコーチ候補が試すもの）のやりとりは送らない */
  | 'demo_coach'
  | ActivitySkipReason

type Dependencies = Readonly<{
  findContext: (message: NotificationMessage) => Promise<Omit<NotificationContext, 'appUrl'> | null>
  /** やりとりの通知で、受け取る人から見たスレッドの様子（thread が持つ） */
  findActivityFacts: (
    threadId: string,
    recipient: 'coach' | 'student'
  ) => Promise<ActivityFacts | null>
  findLineRecipient: (userId: string) => Promise<{ lineUserId: string; isFriend: boolean } | null>
  /** 送れるメールアドレス（LINE の仮のアドレスは null） */
  findEmail: (userId: string) => Promise<string | null>
  sendLinePush: (lineUserId: string, text: string) => Promise<void>
  sendEmail: (input: { to: string; subject: string; text: string }) => Promise<void>
  /** デモのコーチか（demo が持つ） */
  isDemoCoach: (coachUserId: string) => Promise<boolean>
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
  if (await deps.isDemoCoach(ctx.coachUserId)) {
    return ok({ sent: false, reason: 'demo_coach' })
  }
  // やりとりの通知は、もう見た・あとの通知がある なら送らず、まだ見ていないものをまとめて知らせる
  let unseen: ActivityFacts['unseen'] | null = null
  if (isActivity(message) && message.occurredAt) {
    const facts = await deps.findActivityFacts(message.threadId, activityRecipient(message))
    if (facts) {
      const skip = shouldDeliverActivity({ occurredAt: new Date(message.occurredAt), facts })
      if (skip) return ok({ sent: false, reason: skip })
      unseen = facts.unseen
    }
  }
  const notification = composeNotification(message, { ...ctx, unseen, appUrl: deps.appUrl })

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
