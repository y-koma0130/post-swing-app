import type { NotificationMessage } from '../values/NotificationMessage'

export type NotificationContext = Readonly<{
  appUrl: string
  coachName: string
  coachSlug: string
  coachUserId: string
  studentName: string
  studentUserId: string
  expiresAt: Date | null
  /** やりとりの通知で、受け取る人がまだ見ていない出来事の数（まとめて知らせる）。なければ null */
  unseen?: Readonly<{ submissions: number; replies: number; messages: number }> | null | undefined
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

/** まだ見ていないものをまとめた言い方（「添削とメッセージ」）。何もなければ null */
const unseenPhrase = (
  unseen: NotificationContext['unseen'],
  to: 'coach' | 'student'
): string | null => {
  if (!unseen) return null
  const parts = [
    to === 'coach' && unseen.submissions > 0 ? '動画' : null,
    to === 'student' && unseen.replies > 0 ? '添削' : null,
    unseen.messages > 0 ? 'メッセージ' : null,
  ].filter((p): p is string => p !== null)
  return parts.length > 0 ? parts.join('と') : null
}

/** 名前が空のとき（LINE の表示名を消している人など）は「生徒」と呼ぶ */
const nameOrDefault = (name: string, fallback: string): string =>
  name.trim() === '' ? fallback : name

/**
 * 通知の文面と送り先を決める
 *
 * ドメインルール:
 * - 生徒には LINE（サービス共通の公式アカウント）で、1つの出来事につき1通
 * - コーチにはメールで知らせる
 * - 本文には、開くページの URL を入れる（LINE のトーク画面からそのまま開ける）
 */
export const composeNotification: ComposeNotification = (message, rawCtx) => {
  const ctx = {
    ...rawCtx,
    studentName: nameOrDefault(rawCtx.studentName, '生徒'),
    coachName: nameOrDefault(rawCtx.coachName, 'コーチ'),
  }
  const studentThreadUrl = (threadId: string) => `${ctx.appUrl}/t/${threadId}`
  const coachThreadUrl = (threadId: string) => `${ctx.appUrl}/coach/threads/${threadId}`
  // やりとりの通知は、まだ見ていないものをまとめて1通にする
  const toStudent = unseenPhrase(ctx.unseen, 'student')
  const toCoach = unseenPhrase(ctx.unseen, 'coach')

  switch (message.kind) {
    case 'reply_sent':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: `${toStudent ?? '添削'}が届きました`,
        text: `${ctx.coachName}さんから${toStudent ?? '添削'}が届きました。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'chat_message':
      return message.to === 'student'
        ? {
            channel: 'line',
            recipientUserId: ctx.studentUserId,
            subject: `${toStudent ?? 'メッセージ'}が届きました`,
            text: `${ctx.coachName}さんから${toStudent ?? 'メッセージ'}が届きました。\n${studentThreadUrl(message.threadId)}`,
          }
        : {
            channel: 'email',
            recipientUserId: ctx.coachUserId,
            subject: `${ctx.studentName}さんから${toCoach ?? 'メッセージ'}が届きました`,
            text: `${ctx.studentName}さんから${toCoach ?? 'メッセージ'}が届きました。\n\n${coachThreadUrl(message.threadId)}`,
          }
    case 'video_submitted':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんから${toCoach ?? '動画'}が届きました`,
        text: `${ctx.studentName}さんから${toCoach ?? '動画'}が届きました。添削をお願いします。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'thread_expiring':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: 'レッスンの期限が近づいています',
        text: `${ctx.coachName}さんとのレッスンは${ctx.expiresAt ? formatDate(ctx.expiresAt) : 'もうすぐ'}までです。撮り直した動画やご質問はお早めにどうぞ。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'thread_closed':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: 'レッスンが終わりました',
        text: `${ctx.coachName}さんとのレッスンが終わりました。おつかれさまでした。よければ、${ctx.coachName}さんのレビューを書いてください（ほかの生徒がコーチを選ぶ参考になります）。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'waitlist_opened':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '受付に空きが出ました',
        text: `${ctx.coachName}さんの受付に空きが出ました。\n${ctx.appUrl}/c/${ctx.coachSlug}/apply`,
      }
    case 'application_received':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんから申し込みがありました`,
        text: `${ctx.studentName}さんから申し込みがありました。悩みと動画を見て、48時間以内に受けるか決めてください。受けると生徒への請求が確定し、添削を始められます。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'application_approved':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '申し込みが受け付けられました',
        text: `${ctx.coachName}さんが申し込みを受け付けました。添削が届いたら、またお知らせします。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'application_declined':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '申し込みをお受けできませんでした',
        text: `${ctx.coachName}さんは、今回の申し込みをお受けできませんでした。請求はされません。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'retake_requested':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '撮り直しのお願いが届きました',
        text: `${ctx.coachName}さんから、動画の撮り直しのお願いが届きました。撮り直した動画は、提出の回数には数えません。今すぐ撮れないときは、レッスンの画面から伝えられます。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'retake_sent':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんから撮り直しの動画が届きました`,
        text: `${ctx.studentName}さんから、お願いした撮り直しの動画が届きました。添削をお願いします（返信の目安は、届いた時点から数えます）。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'retake_declined':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんは今は撮り直せないそうです`,
        text: `${ctx.studentName}さんから、今は撮り直せないと返事がありました。いまの動画で添削をお願いします（返信の目安は、この時点から数えます）。\n\n${coachThreadUrl(message.threadId)}`,
      }
    case 'application_expired':
      return {
        channel: 'line',
        recipientUserId: ctx.studentUserId,
        subject: '申し込みが取り消されました',
        text: `${ctx.coachName}さんから期限までにお返事がなかったため、申し込みを取り消しました。請求はされません。\n${studentThreadUrl(message.threadId)}`,
      }
    case 'thread_started':
      return {
        channel: 'email',
        recipientUserId: ctx.coachUserId,
        subject: `${ctx.studentName}さんの月額の新しい月が始まりました`,
        text: `${ctx.studentName}さんの月額の支払いが済み、新しい月のレッスンが始まりました。生徒が動画を送ったら、またお知らせします。\n\n${coachThreadUrl(message.threadId)}`,
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
        subject: `不在中に届いた動画の提出が${message.submissionCount}件、質問が${message.chatCount}件あります`,
        text: `おかえりなさい。不在中に届いた動画の提出が${message.submissionCount}件、生徒からの質問が${message.chatCount}件あります。返信をお願いします。\n\n${ctx.appUrl}/coach`,
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
