import 'server-only'
import { getSiteUrl } from '@/server/utils/siteUrl'

/** デモ用のリンク（開くと、そのデモのコーチとしてログインしてホームを開く） */
export const demoLoginUrl = (token: string): string => {
  const url = new URL('/api/auth/demo-login', getSiteUrl())
  url.searchParams.set('token', token)
  return url.toString()
}
