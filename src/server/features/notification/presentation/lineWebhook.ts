import 'server-only'
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { parseJson } from '@/server/utils/parseJson'
import { saveLineFriend } from '../infrastructure/repositories/notificationRepository'

const webhookSchema = z.object({
  events: z.array(
    z.object({
      type: z.string(),
      source: z.object({ userId: z.string().optional() }).optional(),
    })
  ),
})

const base64 = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes)))

/** LINE の署名（チャネルシークレットでの HMAC-SHA256）を確かめる */
const verifySignature = async (body: string, signature: string): Promise<boolean> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.LINE_MESSAGING_CHANNEL_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const expected = base64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
  return expected === signature
}

/**
 * LINE 公式アカウント（Messaging API）の Webhook
 * 友だち追加（follow）・ブロック（unfollow）を記録する。友だちでない人には通知を送らない
 */
export const handleLineWebhook = async (request: Request): Promise<Response> => {
  const signature = request.headers.get('x-line-signature')
  const body = await request.text()
  if (
    !signature ||
    !env.LINE_MESSAGING_CHANNEL_SECRET ||
    !(await verifySignature(body, signature))
  ) {
    return new Response('署名が正しくありません', { status: 401 })
  }
  const parsed = webhookSchema.safeParse(parseJson(body))
  if (!parsed.success) {
    return new Response('ok', { status: 200 })
  }
  for (const event of parsed.data.events) {
    const userId = event.source?.userId
    if (!userId) continue
    if (event.type === 'follow') await saveLineFriend(userId, true)
    if (event.type === 'unfollow') await saveLineFriend(userId, false)
  }
  return new Response('ok', { status: 200 })
}
