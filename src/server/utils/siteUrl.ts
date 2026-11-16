import 'server-only'
import { env } from 'cloudflare:workers'

/** 公開している URL（SNS のカードの画像など、絶対 URL が要るところで使う） */
export const getSiteUrl = (): URL => new URL(env.APP_URL || 'http://localhost:5173')
