import 'server-only'
import { env } from 'cloudflare:workers'
import { logWarn } from '@/server/utils/logger'

export type FetchLineFriendship = (lineUserId: string) => Promise<boolean | null>

/**
 * 公式アカウントの友だちかどうかを LINE に問い合わせる
 *
 * Messaging API のプロフィール取得は、友だちなら 200、友だちでない（ブロック中を含む）なら 404 を返す。
 * LINE ログインと Messaging API のチャネルが同じプロバイダーの下にあるので、ユーザーIDは共通。
 * 問い合わせられないとき（開発中・トークン未設定・LINE の障害）は null
 */
export const fetchLineFriendship: FetchLineFriendship = async (lineUserId) => {
  if (import.meta.env.DEV || !env.LINE_MESSAGING_ACCESS_TOKEN) return null
  const response = await fetch(
    `https://api.line.me/v2/bot/profile/${encodeURIComponent(lineUserId)}`,
    { headers: { authorization: `Bearer ${env.LINE_MESSAGING_ACCESS_TOKEN}` } }
  )
  if (response.ok) return true
  if (response.status === 404) return false
  logWarn('notification', 'LINE の友だち状態を確かめられませんでした', {
    counts: { status: response.status },
  })
  return null
}
