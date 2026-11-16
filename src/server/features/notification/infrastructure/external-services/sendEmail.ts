import 'server-only'
import { env } from 'cloudflare:workers'

export type SendEmail = (input: { to: string; subject: string; text: string }) => Promise<void>

/** コーチへのお知らせメール。開発中は送らずにログへ出す */
export const sendEmail: SendEmail = async ({ to, subject, text }) => {
  if (import.meta.env.DEV) {
    console.info(`[dev] メール ${to}: ${subject}\n${text}`)
    return
  }
  await env.EMAIL.send({ from: env.EMAIL_FROM, to, subject, text })
}
