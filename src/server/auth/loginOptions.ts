import 'server-only'
import { env } from 'cloudflare:workers'

export type LoginOptions = Readonly<{
  /** LINE ログインのチャネルが設定されているか */
  line: boolean
  /** 開発中だけ、生徒もメールのコードでログインできる（LINE のチャネルがなくても確認できるように） */
  devEmail: boolean
}>

export const getLoginOptions = (): LoginOptions => ({
  line: Boolean(env.LINE_LOGIN_CHANNEL_ID && env.LINE_LOGIN_CHANNEL_SECRET),
  devEmail: import.meta.env.DEV,
})
