import 'server-only'
import { env } from 'cloudflare:workers'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { headers } from 'next/headers'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

/**
 * 管理画面へのリクエストか（Cloudflare Access を通ってきたか）
 *
 * /admin は Cloudflare Access の奥に置く。Access の設定漏れに備えて、アプリでも Access が付ける
 * JWT（Cf-Access-Jwt-Assertion）を検証する。開発中は常に通す
 */
export const isAdminRequest = async (): Promise<boolean> => {
  if (import.meta.env.DEV) {
    return true
  }
  const token = (await headers()).get('cf-access-jwt-assertion')
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return false
  }
  jwks ??= createRemoteJWKSet(new URL('/cdn-cgi/access/certs', env.ACCESS_TEAM_DOMAIN))
  try {
    await jwtVerify(token, jwks, { issuer: env.ACCESS_TEAM_DOMAIN, audience: env.ACCESS_AUD })
    return true
  } catch {
    return false
  }
}
