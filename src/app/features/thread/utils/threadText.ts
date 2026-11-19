import type { ChatBlocker } from '@/server/features/thread/domain/services/checkChatMessage.service'
import type { SubmissionBlocker } from '@/server/features/thread/domain/services/checkSubmission.service'
import type { ChatQuote, QuoteKind } from '@/server/features/thread/domain/values/ChatMessage'
import type {
  CoachDeclineReason,
  DeclineReason,
} from '@/server/features/thread/domain/values/DeclineReason'
import type { RoundFrequency } from '@/server/features/thread/domain/values/GolfProfile'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'
import type { RetakeReason } from '@/server/features/thread/domain/values/RetakeRequest'
import type { ThreadStatus } from '@/server/features/thread/domain/values/ThreadStatus'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'

/** 撮った角度の呼び方 */
export const ANGLE_LABEL = {
  front: '正面',
  back: '後方',
  other: 'その他',
} as const satisfies Record<VideoAngle, string>

/**
 * 動画の呼び方。角度が「その他」で1本だけなら、ただ「動画」と呼ぶ
 * （角度を選ぶ前に送られた動画も「その他」になっているので）
 */
export const videoLabel = (angle: VideoAngle, videoCount: number): string =>
  angle === 'other' && videoCount === 1 ? '動画' : ANGLE_LABEL[angle]

/**
 * 提出の中の動画の呼び方。撮り直しの動画には「撮り直し」を付ける
 * （「その他」で1本だけ、の判定は最初に送った動画だけで数える）
 */
export const submissionVideoLabel = (
  video: { angle: VideoAngle; retake: boolean },
  videos: ReadonlyArray<{ retake: boolean }>
): string =>
  video.retake
    ? `撮り直し・${ANGLE_LABEL[video.angle]}`
    : videoLabel(video.angle, videos.filter((v) => !v.retake).length)

/** 選ぶ順（正面・後方がふつう） */
export const ANGLES = ['front', 'back', 'other'] as const satisfies VideoAngle[]

/** 「1回目」など（index は0から） */
export const ordinalLabel = (index: number): string => `${index + 1}回目`

/** 「1回目の提出」など */
export const submissionLabel = (index: number): string => `${ordinalLabel(index)}の提出`

/** 生徒がいま提出できない理由 */
export const SUBMISSION_BLOCKER_MESSAGE = {
  awaiting_reply: 'コーチの添削を待っています。届いたら LINE でお知らせします。',
  submission_limit: 'このレッスンで提出できる回数は、すべて使いました。',
  expired: 'このレッスンは期限が切れました。',
  closed: 'このレッスンは終了しました。',
} as const satisfies Record<SubmissionBlocker, string>

/** 提出できないときの、ボタンに出す短い言い方 */
export const SUBMISSION_BLOCKER_SHORT = {
  awaiting_reply: '添削を待っています',
  submission_limit: '提出は使い切りました',
  expired: '期限が切れました',
  closed: '終了しました',
} as const satisfies Record<SubmissionBlocker, string>

/** 生徒がいまチャットを送れない理由 */
export const STUDENT_CHAT_BLOCKER_MESSAGE = {
  closed: 'このレッスンは終了しました',
  not_started: '申し込みが受け付けられると、コーチにチャットで質問できます',
  no_submission: '最初の動画を提出すると、コーチにチャットで質問できます',
  limit_reached: 'このレッスンで送れるメッセージは、すべて使いました',
} as const satisfies Record<
  Extract<ChatBlocker, 'closed' | 'not_started' | 'no_submission' | 'limit_reached'>,
  string
>

/** 申し込みを断った理由 */
export const DECLINE_REASON_LABEL = {
  out_of_scope: '今回のお悩みは、このコーチの得意分野から外れていました',
  unavailable: 'いまは新しい申し込みを受けるのが難しい状況です',
  video_unclear: '動画が見づらく、添削が難しい内容でした',
  other: 'コーチの都合により、お受けできませんでした',
  expired: '期限までにコーチからお返事がありませんでした',
} as const satisfies Record<DeclineReason, string>

/** コーチが選ぶ、断る理由の短い言い方 */
export const COACH_DECLINE_REASON_OPTION = {
  out_of_scope: '得意分野から外れている',
  unavailable: 'いまは受けるのが難しい',
  video_unclear: '動画が見づらい',
  other: 'その他',
} as const satisfies Record<CoachDeclineReason, string>

/** スレッドの残り（「提出 1/3回・チャット 残り28通」） */
export const threadUsageText = (
  input: Readonly<{
    submissionCount: number
    maxSubmissions: number
    remainingStudentMessages?: number | undefined
  }>
): string => {
  const submissions = `提出 ${input.submissionCount}/${input.maxSubmissions}回`
  return input.remainingStudentMessages === undefined
    ? submissions
    : `${submissions}・チャット 残り${input.remainingStudentMessages}通`
}

/** 添削カードのキー位置の呼び方 */
export const KEY_POSITION_LABEL = {
  address: 'アドレス',
  top: 'トップ',
  impact: 'インパクト',
  finish: 'フィニッシュ',
} as const satisfies Record<KeyPosition, string>

/** 引用の見出し（「1回目・正面の動画」「1回目の添削・トップ」「コーチ：ここの左手…」） */
export const quoteLabel = (quote: ChatQuote): string => {
  switch (quote.kind) {
    case 'video':
      return quote.submissionIndex === null || quote.angle === null
        ? 'コーチの動画'
        : `${ordinalLabel(quote.submissionIndex)}・${ANGLE_LABEL[quote.angle]}の動画`
    case 'card':
      return `${ordinalLabel(quote.submissionIndex)}の添削・${KEY_POSITION_LABEL[quote.position]}`
    case 'message':
      return `${quote.from === 'coach' ? 'コーチ' : '生徒'}：${quote.excerpt}`
  }
}

/** 引用先の要素の id（引用を押すと、そこへスクロールする） */
export const quoteAnchorId = (kind: QuoteKind, targetId: string): string =>
  `quote-${kind}-${targetId}`

/** ふだんのラウンドの回数の呼び方（申し込みの選択肢と、コーチへの表示） */
export const ROUND_FREQUENCY_LABEL = {
  not_yet: 'まだコースに出ていない',
  few_per_year: '年に数回',
  monthly: '月1回くらい',
  two_to_three_per_month: '月2〜3回',
  weekly: '週1回以上',
} as const satisfies Record<RoundFrequency, string>

/** 選択肢の並び（少ない順） */
export const ROUND_FREQUENCIES = [
  'not_yet',
  'few_per_year',
  'monthly',
  'two_to_three_per_month',
  'weekly',
] as const satisfies RoundFrequency[]

/** 撮り直しをお願いする理由の呼び方（コーチが選ぶ・生徒に見せる） */
export const RETAKE_REASON_LABEL = {
  framing: '全身やクラブが画面に入っていない',
  angle: '撮る角度・位置を変えてほしい',
  quality: '暗い・ぶれて見えにくい',
  other: 'その他',
} as const satisfies Record<RetakeReason, string>

export const RETAKE_REASONS = [
  'framing',
  'angle',
  'quality',
  'other',
] as const satisfies RetakeReason[]

/** スレッドの状態の呼び方（一覧・カルテ・運営画面で同じ言い方にする）。生徒には承認待ちを「コーチの確認待ち」と言う */
export const THREAD_STATUS_LABEL = {
  coach: {
    draft: '申し込み途中',
    requested: '承認待ち',
    waiting_coach: '添削待ち',
    waiting_student: 'レッスン中',
    closed: '完了',
    declined: 'お断り',
  },
  student: {
    draft: '申し込み途中',
    requested: 'コーチの確認待ち',
    waiting_coach: '添削待ち',
    waiting_student: 'レッスン中',
    closed: '完了',
    declined: 'お断り',
  },
} as const satisfies Record<'coach' | 'student', Record<ThreadStatus, string>>
