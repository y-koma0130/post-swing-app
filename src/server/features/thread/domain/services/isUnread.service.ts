export type IsUnread = (
  input: Readonly<{
    /** 相手側のいちばん新しい出来事（生徒なら提出・チャット、コーチなら添削・チャット） */
    latestCounterpartActivityAt: Date | null
    /** 自分がスレッドを最後に開いた時刻 */
    lastReadAt: Date | null
  }>
) => boolean

/**
 * まだ見ていない出来事があるか
 *
 * ドメインルール:
 * - 相手の出来事が、自分が最後に開いたあとにあれば未読
 * - 自分の発言は数えない
 */
export const isUnread: IsUnread = ({ latestCounterpartActivityAt, lastReadAt }) =>
  latestCounterpartActivityAt !== null &&
  (lastReadAt === null || latestCounterpartActivityAt.getTime() > lastReadAt.getTime())
