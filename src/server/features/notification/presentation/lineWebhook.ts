import 'server-only'
import { z } from 'zod'
import { parseJson } from '@/server/utils/parseJson'
import { verifyLineSignature } from '../infrastructure/external-services/verifyLineSignature'
import { saveLineFriend } from '../infrastructure/repositories/notificationRepository'

const webhookSchema = z.object({
  events: z.array(
    z.object({
      type: z.string(),
      source: z.object({ userId: z.string().optional() }).optional(),
    })
  ),
})

/**
 * LINE 公式アカウント（Messaging API）の Webhook
 * 友だち追加（follow）・ブロック（unfollow）を記録する。友だちでない人には通知を送らない
 */
export const handleLineWebhook = async (request: Request): Promise<Response> => {
  const body = await request.text()
  if (!(await verifyLineSignature(body, request.headers.get('x-line-signature')))) {
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
