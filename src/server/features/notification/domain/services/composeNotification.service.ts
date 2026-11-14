import type { NotificationMessage } from '../values/NotificationMessage'

export type NotificationContext = Readonly<{
  appUrl: string
  coachName: string
  coachSlug: string
  coachUserId: string
  studentName: string
  studentUserId: string
  expiresAt: Date | null
}>

export type ComposedNotification = Readonly<{
  /** 生徒へは LINE、コーチへはメール */
  channel: 'line' | 'email'
  recipientUserId: string
  subject: string
  text: string
}>

const formatDate = (date: Date): string =>
  date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Tokyo' })

export type ComposeNotification = (
  message: NotificationMessage,
  ctx: NotificationContext
) => ComposedNotification

/**
 * 通知の文面と送り先を決める
 *
 * ドメインルール:
 * - 生徒には LINE（サービス共通の公式アカウント）で、1つの出来事につき1通
 * - コーチにはメールで知らせる
 * - 本文には、開くページの URL を入れる（LINE のトーク画面からそのまま開ける）
 */
export const composeNotification: ComposeNotification = (message, ctx) => {
  const studentThreadUrl = (threadId: string) => `${ctx.appUrl}/t/${threadId}`
  const coachThreadUrl = (threadId: string) => `${ctx.appUrl}/coach/threads/${threadId}`

  switch (message.kind) {
    case 'reply_sent':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '添削が届きました',
        text: `${ctx.coachName}さんから添削が届きました。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'chat_message':
      return message.to === 'student'
        ? {
            channel: 'line',
            recipientUserId: ctx.studentUserId,
            subject: 'メッセージが届きました',
            text: `${ctx.coachName}さんからメッセージが届きました。\n${studentThreadUrl(message.threadId)}`,
          }
        : {
            channel: 'email',
            recipientUserId: ctx.coachUserId,
            subject: `${ctx.studentName}さんからメッセージが届きました`,
            text: `${ctx.studentName}さんからメッセージが届きました。\n\n${coachThreadUrl(message.threadId)}`,
          }
    case 'video_submitted':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんから動画が届きました`,
        text: `${ctx.studentName}さんから動画が届きました。添削をお願いします。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'thread_expiring':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: 'スレッドの期限が近づいています',
        text: `${ctx.coachName}さんとのスレッドは${ctx.expiresAt ? formatDate(ctx.expiresAt) : 'もうすぐ'}までです。撮り直した動画やご質問はお早めにどうぞ。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'waitlist_opened':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '受付に空きが出ました',
        text: `${ctx.coachName}さんの受付に空きが出ました。\n${ctx.appUrl}/c/${ctx.coachSlug}/apply`,
      }
  }
}
