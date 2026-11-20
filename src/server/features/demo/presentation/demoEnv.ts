import 'server-only'
import {
  generateCoachSlug,
  RANDOM_SLUG_LENGTH,
} from '@/server/features/coach/domain/services/generateCoachSlug.service'
import { isStaging } from '@/server/utils/siteUrl'
import { DEMO_RULES } from '../domain/rules'
import { randomMonitorCode } from '../infrastructure/repositories/buildDemoSeed'

/** デモを使える環境か（staging と開発中だけ。本番では作れず、リンクでも入れない） */
export const isDemoEnabled = (): boolean => import.meta.env.DEV || isStaging()

/** デモ用のリンクのトークン（URL に入れられる文字） */
export const generateDemoToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(DEMO_RULES.tokenBytes))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

/** トークンのハッシュ（SHA-256 の16進）。DB にはこれだけを持つ */
export const hashDemoToken = async (token: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** デモの受付ページのアドレス（ランダム。デモだと分かるように demo- を付ける） */
export const generateDemoSlug = (): string =>
  `demo-${generateCoachSlug(crypto.getRandomValues(new Uint8Array(RANDOM_SLUG_LENGTH)))}`

export const generateDemoMonitorCode = (): string =>
  randomMonitorCode((max) => {
    const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
    return value % max
  })
