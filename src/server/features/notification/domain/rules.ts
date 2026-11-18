import type { NotificationMessage } from './values/NotificationMessage'

/** 通知のルール */
export const NOTIFICATION_RULES = {
  /**
   * やりとり（提出・添削・チャット）の通知を遅らせる秒数。
   * 続けて送られたものを1通にまとめ、すぐに見た人には送らない
   */
  activityDelaySeconds: 120,
} as const

/** やりとりの通知（まとめる対象） */
export type ActivityMessage = Extract<
  NotificationMessage,
  { kind: 'reply_sent' | 'chat_message' | 'video_submitted' }
>

export const isActivity = (message: NotificationMessage): message is ActivityMessage =>
  message.kind === 'reply_sent' ||
  message.kind === 'chat_message' ||
  message.kind === 'video_submitted'
