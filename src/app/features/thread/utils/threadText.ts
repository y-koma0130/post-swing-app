import type { ChatBlocker } from '@/server/features/thread/domain/services/checkChatMessage.service'
import type { SubmissionBlocker } from '@/server/features/thread/domain/services/checkSubmission.service'
import type { ChatQuote, QuoteKind } from '@/server/features/thread/domain/values/ChatMessage'
import type { KeyPosition } from '@/server/features/thread/domain/values/KeyPosition'
import type { VideoAngle } from '@/server/features/thread/domain/values/VideoAngle'

/** 撮った角度の呼び方 */
export const ANGLE_LABEL = {
  front: '正面',
  back: '後方',
  other: 'その他',
} as const satisfies Record<VideoAngle, string>

/** 選ぶ順（正面・後方がふつう） */
export const ANGLES = ['front', 'back', 'other'] as const satisfies VideoAngle[]

/** 「1回目」など（index は0から） */
export const ordinalLabel = (index: number): string => `${index + 1}回目`

/** 「1回目の提出」など */
export const submissionLabel = (index: number): string => `${ordinalLabel(index)}の提出`

/** 生徒がいま提出できない理由 */
export const SUBMISSION_BLOCKER_MESSAGE = {
  awaiting_reply: 'コーチの添削を待っています。届いたら LINE でお知らせします。',
  submission_limit: 'このスレッドで提出できる回数は、すべて使いました。',
  expired: 'このスレッドは期限が切れました。',
  closed: 'このスレッドは終了しました。',
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
  closed: 'このスレッドは終了しました',
  no_submission: '最初の動画を提出すると、コーチにチャットで質問できます',
  limit_reached: 'このスレッドで送れるメッセージは、すべて使いました',
} as const satisfies Record<
  Extract<ChatBlocker, 'closed' | 'no_submission' | 'limit_reached'>,
  string
>

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
