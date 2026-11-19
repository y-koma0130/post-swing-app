import { RETAKE_RULES } from '../rules'
import { isOpenRetake, type RetakeRequest } from '../values/RetakeRequest'
import type { Thread } from '../values/Thread'

export type RetakeRequestBlocker = 'not_in_lesson' | 'not_waiting' | 'already_open' | 'retake_limit'

export type CheckRetakeRequest = (input: {
  thread: Pick<Thread, 'status' | 'submissions'>
  requests: ReadonlyArray<Pick<RetakeRequest, 'closedAt'>>
  submissionId: string
}) => RetakeRequestBlocker | null

/**
 * コーチがいま撮り直しをお願いできるか（担当のコーチかはユースケースで確かめる）
 *
 * ドメインルール:
 * - レッスン中で、コーチの添削を待っている提出（いちばん新しく、まだ添削していないもの）にだけお願いできる
 * - 開いているお願いがあるあいだは、次をお願いできない
 * - 1つのスレッドで RETAKE_RULES.maxPerThread 回まで
 */
export const checkRetakeRequest: CheckRetakeRequest = ({ thread, requests, submissionId }) => {
  if (thread.status !== 'waiting_coach') return 'not_in_lesson'
  const latest = thread.submissions.at(-1)
  if (!latest || latest.id !== submissionId || latest.replied) return 'not_waiting'
  if (requests.some(isOpenRetake)) return 'already_open'
  if (requests.length >= RETAKE_RULES.maxPerThread) return 'retake_limit'
  return null
}

/** あと何回お願いできるか */
export const remainingRetakes = (requests: ReadonlyArray<unknown>): number =>
  Math.max(RETAKE_RULES.maxPerThread - requests.length, 0)
