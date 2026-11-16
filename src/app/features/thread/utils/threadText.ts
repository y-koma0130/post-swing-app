import type { ChatBlocker } from '@/server/features/thread/domain/services/checkChatMessage.service'
import type { SubmissionBlocker } from '@/server/features/thread/domain/services/checkSubmission.service'
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
