export type ActivityFacts = Readonly<{
  /** 受け取る人がスレッドを最後に開いた時刻。開いたことがなければ null */
  lastReadAt: Date | null
  /** 送った側（受け取る人の相手）の、いちばん新しい出来事の時刻 */
  latestSenderActivityAt: Date | null
  /** 受け取る人がまだ見ていない、相手からの出来事の数 */
  unseen: Readonly<{ submissions: number; replies: number; messages: number }>
}>

export type ActivitySkipReason = 'already_read' | 'superseded'

export type ShouldDeliverActivity = (
  input: Readonly<{ occurredAt: Date; facts: ActivityFacts }>
) => ActivitySkipReason | null

/**
 * やりとりの通知を送るか（遅らせて届いた時点で判定する）。送らないなら理由を返す
 *
 * ドメインルール:
 * - 受け取る人が、その出来事のあとにスレッドを開いていたら送らない
 * - 同じ相手から、そのあとにも出来事があれば送らない（あとの通知がまとめて知らせる）
 */
export const shouldDeliverActivity: ShouldDeliverActivity = ({ occurredAt, facts }) => {
  if (facts.lastReadAt && facts.lastReadAt.getTime() >= occurredAt.getTime()) return 'already_read'
  if (
    facts.latestSenderActivityAt &&
    facts.latestSenderActivityAt.getTime() > occurredAt.getTime()
  ) {
    return 'superseded'
  }
  return null
}
