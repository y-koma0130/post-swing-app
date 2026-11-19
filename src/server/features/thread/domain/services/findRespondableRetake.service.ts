import { isOpenRetake, type RetakeRequest } from '../values/RetakeRequest'
import type { ThreadStatus } from '../values/ThreadStatus'

export type FindRespondableRetake = (
  input: Readonly<{
    threadStatus: ThreadStatus
    requests: ReadonlyArray<RetakeRequest>
    /** 答えるお願い。動画を上げるとき（どのお願いか決まる前）は null で、開いているものを探す */
    requestId: string | null
  }>
) => RetakeRequest | null

/**
 * 生徒が答えられる撮り直しのお願い（動画を送る・「今は撮れない」と返す）
 *
 * ドメインルール:
 * - お願いが開いている（まだ答えていない）
 * - レッスンがコーチの番（添削待ち）のまま。終わった・返金したレッスンのお願いには答えられない
 */
export const findRespondableRetake: FindRespondableRetake = ({
  threadStatus,
  requests,
  requestId,
}) => {
  if (threadStatus !== 'waiting_coach') return null
  return requests.find((r) => isOpenRetake(r) && (requestId === null || r.id === requestId)) ?? null
}
