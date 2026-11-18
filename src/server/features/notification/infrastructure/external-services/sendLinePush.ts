import 'server-only'
import { env } from 'cloudflare:workers'

export type SendLinePush = (lineUserId: string, text: string) => Promise<void>

/**
 * LINE 公式アカウントからプッシュメッセージを送る
 * プッシュは通数で課金される（無料枠を超えると有料）。1つの出来事につき1通にする
 * 開発中・トークン未設定のときは送らずにログへ出す
 */
export const sendLinePush: SendLinePush = async (lineUserId, text) => {
  if (import.meta.env.DEV || !env.LINE_MESSAGING_ACCESS_TOKEN) {
    console.info(`[dev] LINE プッシュ ${lineUserId}: ${text}`)
    return
  }
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.LINE_MESSAGING_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ to: lineUserId, messages: [{ type: 'text', text }] }),
  })
  if (!response.ok) {
    // 失敗はキューに再送させる。本文や相手の情報はログに出さない
    throw new Error(`LINE の送信に失敗しました: ${response.status}`)
  }
}
