export type LineRecipient = Readonly<{ lineUserId: string; isFriend: boolean }>

type Dependencies = Readonly<{
  findLineRecipient: (
    userId: string
  ) => Promise<{ lineUserId: string; isFriend: boolean | null } | null>
  fetchLineFriendship: (lineUserId: string) => Promise<boolean | null>
  saveLineFriend: (lineUserId: string, isFriend: boolean) => Promise<void>
}>

export type ResolveLineRecipient = (
  params: Readonly<{ userId: string }>,
  dependencies: Dependencies
) => Promise<LineRecipient | null>

/**
 * 通知を送る LINE の相手と、公式アカウントの友だちかどうかを決める
 *
 * ドメインルール:
 * - 友だちかどうかは Webhook（友だち追加・ブロック）の記録を使う
 * - 記録がない人（Webhook を設定する前に友だちになった人など）は LINE に問い合わせ、結果を記録する
 * - 問い合わせられなければ、友だちでないものとして扱う（記録はしない。次の機会にまた問い合わせる）
 */
export const resolveLineRecipient: ResolveLineRecipient = async ({ userId }, deps) => {
  const recipient = await deps.findLineRecipient(userId)
  if (!recipient) return null
  if (recipient.isFriend !== null) {
    return { lineUserId: recipient.lineUserId, isFriend: recipient.isFriend }
  }
  const isFriend = await deps.fetchLineFriendship(recipient.lineUserId)
  if (isFriend === null) {
    return { lineUserId: recipient.lineUserId, isFriend: false }
  }
  await deps.saveLineFriend(recipient.lineUserId, isFriend)
  return { lineUserId: recipient.lineUserId, isFriend }
}
