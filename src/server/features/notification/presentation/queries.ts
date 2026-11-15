import 'server-only'
import { env } from 'cloudflare:workers'
import { getActor } from '@/server/auth/getActor'
import { findLineRecipientWithFriendship } from './lineRecipient'

/**
 * LINE でログインしたのに公式アカウントの友だちでない生徒へ、友だち追加を案内する
 * （友だちでないと添削が届いたことを知らせられない）。案内が要らなければ null
 */
export const getLineFriendPrompt = async (): Promise<{ addFriendUrl: string } | null> => {
  const actor = await getActor()
  if (!actor || !env.LINE_ADD_FRIEND_URL) return null
  const line = await findLineRecipientWithFriendship(actor.userId)
  if (!line || line.isFriend) return null
  return { addFriendUrl: env.LINE_ADD_FRIEND_URL }
}
