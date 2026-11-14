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
} as const
