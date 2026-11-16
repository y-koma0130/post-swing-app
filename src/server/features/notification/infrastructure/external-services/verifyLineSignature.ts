import 'server-only'
import { env } from 'cloudflare:workers'

const base64 = (bytes: ArrayBuffer): string => btoa(String.fromCharCode(...new Uint8Array(bytes)))

export type VerifyLineSignature = (body: string, signature: string | null) => Promise<boolean>

/** LINE の Webhook の署名（チャネルシークレットでの HMAC-SHA256）を確かめる */
export const verifyLineSignature: VerifyLineSignature = async (body, signature) => {
  if (!signature || !env.LINE_MESSAGING_CHANNEL_SECRET) return false
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
