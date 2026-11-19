import 'server-only'
import { env } from 'cloudflare:workers'
import { renderEmailHtml } from './renderEmailHtml'

export type SendEmail = (input: {
  to: string
  subject: string
  /** 本文（テキスト）。HTML 版もここから作る */
  text: string
  /** 大きく見せるコード（ログインコード） */
  code?: string | undefined
}) => Promise<void>

/** メールを送る（テキストと、ロゴの入った HTML の両方）。開発中は送らずにログへ出す */
export const sendEmail: SendEmail = async ({ to, subject, text, code }) => {
  if (import.meta.env.DEV) {
    console.info(`[dev] メール ${to}: ${subject}\n${text}`)
    return
  }
  const html = renderEmailHtml({ subject, text, appUrl: env.APP_URL, code })
  await env.EMAIL.send({ from: env.EMAIL_FROM, to, subject, text, html })
}
