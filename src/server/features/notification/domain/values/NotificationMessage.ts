import { z } from 'zod'

/**
 * キューに積む通知。送り先と文面は、キューを受けた側（consumer）で組み立てる
 * （書き込みの処理を、LINE やメールの失敗で止めないため）
 */
export const notificationMessageSchema = z.discriminatedUnion('kind', [
  /** 生徒へ：添削が届いた（LINE） */
  z.object({ kind: z.literal('reply_sent'), threadId: z.string(), studentUserId: z.string() }),
  /** 相手へ：チャットが届いた（生徒は LINE、コーチはメール） */
  z.object({
    kind: z.literal('chat_message'),
    threadId: z.string(),
    to: z.enum(['coach', 'student']),
    recipientUserId: z.string(),
  }),
  /** コーチへ：新しい動画が届いた（メール） */
  z.object({ kind: z.literal('video_submitted'), threadId: z.string(), coachUserId: z.string() }),
  /** 生徒へ：期限が近い（LINE） */
  z.object({ kind: z.literal('thread_expiring'), threadId: z.string(), studentUserId: z.string() }),
  /** キャンセル待ちの生徒へ：枠が空いた（LINE） */
  z.object({
    kind: z.literal('waitlist_opened'),
    coachUserId: z.string(),
    studentUserId: z.string(),
  }),
  /** コーチへ：申し込みの支払いが済み、スレッドが始まった（メール） */
  z.object({ kind: z.literal('thread_started'), threadId: z.string(), coachUserId: z.string() }),
  /** コーチへ：届いた動画に、しばらく返信していない（メール） */
  z.object({ kind: z.literal('reply_overdue'), threadId: z.string(), coachUserId: z.string() }),
  /** コーチへ：不在が明けた朝に、不在中に届いた動画と質問の件数（メール） */
  z.object({
    kind: z.literal('absence_ended'),
    coachUserId: z.string(),
    videoCount: z.number().int().nonnegative(),
    chatCount: z.number().int().nonnegative(),
  }),
  /** 招待されたコーチへ：ログインの案内（メール） */
  z.object({ kind: z.literal('coach_invited'), coachUserId: z.string() }),
])

export type NotificationMessage = z.infer<typeof notificationMessageSchema>
