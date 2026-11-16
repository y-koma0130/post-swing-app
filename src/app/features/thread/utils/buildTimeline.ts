/**
 * スレッドの時系列（提出・添削・チャット・お知らせを1本に並べる）。
 * DOM に依存しない（ネイティブアプリでも使う）
 */

type Submission<R> = Readonly<{ id: string; submittedAt: Date; reply: R | null }>
type Reply = Readonly<{ sentAt: Date }>
type Message = Readonly<{ id: string; sentAt: Date }>
type Notice = Readonly<{ id: string; createdAt: Date }>

export type TimelineItem<S, M, N> =
  | { kind: 'submission'; key: string; at: Date; index: number; submission: S }
  | { kind: 'reply'; key: string; at: Date; index: number; submission: S }
  | { kind: 'message'; key: string; at: Date; message: M }
  | { kind: 'notice'; key: string; at: Date; notice: N }

/** 同じ時刻なら、提出 → お知らせ → 添削 → チャットの順（不在のお知らせは提出の直後に出す） */
const ORDER = { submission: 0, notice: 1, reply: 2, message: 3 } as const

export const buildTimeline = <
  R extends Reply,
  S extends Submission<R>,
  M extends Message,
  N extends Notice,
>(
  input: Readonly<{
    submissions: ReadonlyArray<S>
    messages: ReadonlyArray<M>
    notices: ReadonlyArray<N>
  }>
): Array<TimelineItem<S, M, N>> => {
  const items: Array<TimelineItem<S, M, N>> = []
  input.submissions.forEach((submission, index) => {
    items.push({
      kind: 'submission',
      key: `s-${submission.id}`,
      at: submission.submittedAt,
      index,
      submission,
    })
    if (submission.reply) {
      items.push({
        kind: 'reply',
        key: `r-${submission.id}`,
        at: submission.reply.sentAt,
        index,
        submission,
      })
    }
  })
  for (const message of input.messages) {
    items.push({ kind: 'message', key: `m-${message.id}`, at: message.sentAt, message })
  }
  for (const notice of input.notices) {
    items.push({ kind: 'notice', key: `n-${notice.id}`, at: notice.createdAt, notice })
  }
  return items.toSorted((a, b) => a.at.getTime() - b.at.getTime() || ORDER[a.kind] - ORDER[b.kind])
}

/** 時系列のいちばん新しい出来事の時刻（ミリ秒）。何もなければ 0 */
export const latestTimelineAt = (
  input: Readonly<{
    submissions: ReadonlyArray<{ submittedAt: Date; reply: { sentAt: Date } | null }>
    messages: ReadonlyArray<{ sentAt: Date }>
  }>
): number =>
  Math.max(
    0,
    ...input.submissions.flatMap((s) => [
      s.submittedAt.getTime(),
      ...(s.reply ? [s.reply.sentAt.getTime()] : []),
    ]),
    ...input.messages.map((m) => m.sentAt.getTime())
  )

/**
 * 「ここから新着」の線を引く位置：最後に開いたあとの、相手の最初の出来事。
 * 開いたことがなければ線は引かない（全部が新しいので）
 */
export const firstNewItemKey = <S, M extends { from: 'coach' | 'student' }, N>(
  items: ReadonlyArray<TimelineItem<S, M, N>>,
  input: Readonly<{ lastReadAt: Date | null; counterpart: 'coach' | 'student' }>
): string | null => {
  const { lastReadAt, counterpart } = input
  if (!lastReadAt) return null
  const fromCounterpart = (item: TimelineItem<S, M, N>): boolean => {
    switch (item.kind) {
      case 'submission':
        return counterpart === 'student'
      case 'reply':
        return counterpart === 'coach'
      case 'message':
        return item.message.from === counterpart
      case 'notice':
        return false
    }
  }
  const first = items.find(
    (item) => item.at.getTime() > lastReadAt.getTime() && fromCounterpart(item)
  )
  return first?.key ?? null
}
