import type { PlanKind } from '@/server/features/coach/domain/values/Plan'

/**
 * スレッドのルール（暫定）。計画書「5. サービスの仕組み」より
 */
export const THREAD_RULES = {
  /** 提出できる回数。お試しは1回のミニスレッド */
  maxSubmissionsByPlan: { trial: 1, single: 3, monthly: 3 } as const satisfies Record<
    PlanKind,
    number
  >,
  /** 1回の提出で送れる動画の本数（正面と後方など） */
  maxVideosPerSubmission: 2,
  /** 生徒がスレッド全体で送れるチャットの通数（提出の回数とは別に数える） */
  maxStudentMessagesByPlan: { trial: 10, single: 30, monthly: 30 } as const satisfies Record<
    PlanKind,
    number
  >,
  /** 提出に添えるメモ */
  maxSubmissionNoteLength: 1000,
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
  /** 1本の長さの上限（秒）。スイングの前後を含めて十分な長さ */
  maxDurationSeconds: 60,
} as const

/** 返信のルール */
export const REPLY_RULES = {
  /** 1回の添削に入れられる画像（キャプチャ）の枚数 */
  maxCards: 8,
  /** 添削の説明（全体のコメント）の長さ */
  maxCommentLength: 2000,
  /** 添えられるおすすめのドリルの数 */
  maxDrills: 3,
  /** カード画像（PNG）1枚の大きさの上限 */
  maxImageBytes: 5 * 1024 * 1024,
} as const

/** チャットのルール */
export const CHAT_RULES = {
  maxLength: 1000,
} as const

/** レッスン中のスレッドの状態。期限・返信の遅れ・期限前のお知らせは、これだけを見る */
export const IN_LESSON_STATUSES = ['waiting_student', 'waiting_coach'] as const

/**
 * 受付枠に数えるスレッドの状態（レッスン中と、承認待ち）。下書きは数えない。
 * 申し込み・受付ページ・キャンセル待ちで、同じ数え方をする
 */
export const CAPACITY_COUNTED_STATUSES = [...IN_LESSON_STATUSES, 'requested'] as const

/** 申し込み（承認制）のルール（暫定） */
export const APPLICATION_RULES = {
  /**
   * コーチが受けるか決める期限（時間）。過ぎたら断った扱いにしてカードの仮押さえを外す。
   * カードの仮押さえは7日で切れるので、それより十分短くする
   */
  approvalHours: 48,
  /** カードを登録しないままの下書きを何時間で消すか */
  draftRetentionHours: 24,
} as const

/** 毎日の処理のルール */
export const MAINTENANCE_RULES = {
  /** 期限の何日前に知らせるか */
  remindDaysBefore: 3,
  /**
   * 返信の遅れを調べる範囲（届いてから何日までの動画を見るか）。
   * 期限そのものは返信目安（coach の AVAILABILITY_RULES）で決まる。不在が長くても収まるよう広めにとる
   */
  unrepliedLookbackDays: 60,
  /** スレッドの終了から何日で動画を消すか（暫定。利用規約で決める） */
  videoRetentionDays: 90,
  /** 上げたまま提出しなかった動画（下書き）を何時間で消すか */
  draftVideoRetentionHours: 24,
} as const

/** 撮り直しのお願いのルール（暫定） */
export const RETAKE_RULES = {
  /** 1つのスレッドでお願いできる回数 */
  maxPerThread: 2,
} as const
