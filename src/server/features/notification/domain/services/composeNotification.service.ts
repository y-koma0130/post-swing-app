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
/** 名前が空のとき（LINE の表示名を消している人など）は「生徒」と呼ぶ */
const nameOrDefault = (name: string, fallback: string): string =>
  name.trim() === '' ? fallback : name

export const composeNotification: ComposeNotification = (message, rawCtx) => {
  const ctx = {
    ...rawCtx,
    studentName: nameOrDefault(rawCtx.studentName, '生徒'),
    coachName: nameOrDefault(rawCtx.coachName, 'コーチ'),
  }
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
    case 'thread_started':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんから申し込みがありました`,
        text: `${ctx.studentName}さんの申し込み（支払い済み）が入りました。生徒が動画を送ったら、またお知らせします。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'reply_overdue':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんの動画が添削を待っています`,
        text: `${ctx.studentName}さんから届いた動画に、まだ返信していません。生徒が待っているので、添削をお願いします。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'absence_ended':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `不在中に届いた動画が${message.videoCount}件、質問が${message.chatCount}件あります`,
        text: `おかえりなさい。不在中に届いた動画が${message.videoCount}件、生徒からの質問が${message.chatCount}件あります。返信をお願いします。\n\n${ctx.appUrl}/coach`,
      }
    case 'coach_invited':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: 'SwingPost にコーチとして招待されました',
        text: [
          `${ctx.coachName}さん`,
          '',
          'SwingPost（ゴルフのスイング動画添削サービス）にコーチとして招待されました。',
          '次のページで、このメールアドレスを入力してログインしてください。届いた6桁のコードを入れるとログインできます。',
          '',
          `${ctx.appUrl}/coach/login`,
          '',
          'ログインしたら、設定画面でプロフィール・プラン・売上の受け取り口座を登録すると、受付ページを公開できます。',
          '',
          'このメールに心当たりがない場合は、そのまま削除してください。',
        ].join('\n'),
      }
  }
}
