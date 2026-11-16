import type { PlanKind } from '@/server/features/coach/domain/values/Plan'

/**
 * スレッドのルール（暫定）。計画書「5. サービスの仕組み」より
 */
export const THREAD_RULES = {
  /** 送れる動画の本数。お試しは1本のミニスレッド */
  maxVideosByPlan: { trial: 1, single: 3, monthly: 3 } as const satisfies Record<PlanKind, number>,
  maxStudentMessagesPerVideo: 3,
  durationDays: 30,
} as const

/** 動画ファイルのルール */
export const VIDEO_RULES = {
  /** Workers が受け取れるリクエストの上限に合わせる */
  maxBytes: 100 * 1024 * 1024,
  /** iPhone（mov）・Android（mp4）・ブラウザで撮ったもの（webm） */
  allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
  /** 受け取るフレームレートの範囲。外れた値は記録しない（スマホのスロー撮影は 240fps まで） */
  minFrameRate: 1,
  maxFrameRate: 1000,
  /** 動画に添えるメモ */
  maxNoteLength: 1000,
} as const

/** 返信のルール */
export const REPLY_RULES = {
  /** 1通の返信に入れられるカードの枚数 */
  maxCards: 8,
  /** カード画像（PNG）1枚の大きさの上限 */
  maxImageBytes: 5 * 1024 * 1024,
} as const

/** チャットのルール */
export const CHAT_RULES = {
  maxLength: 1000,
} as const

/**
 * 受付枠に数えるスレッドの状態（終わっていないもの）。
 * 申し込み・受付ページ・キャンセル待ちで、同じ数え方をする
 */
export const CAPACITY_COUNTED_STATUSES = ['waiting_student', 'waiting_coach'] as const

/** 毎日の処理のルール */
export const MAINTENANCE_RULES = {
  /** 期限の何日前に知らせるか */
  remindDaysBefore: 3,
  /** スレッドの終了から何日で動画を消すか（暫定。利用規約で決める） */
  videoRetentionDays: 90,
} as const
