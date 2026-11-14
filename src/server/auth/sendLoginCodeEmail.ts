import 'server-only'
import { env } from 'cloudflare:workers'

/**
 * ログイン用の6桁コードをメールで送る。開発中は送らずにログへ出す
 */
export const sendLoginCodeEmail = async ({ to, code }: { to: string; code: string }) => {
  if (import.meta.env.DEV) {
    console.info(`[dev] ログインコード ${to}: ${code}`)
    return
  }
  await env.EMAIL.send({
    from: env.EMAIL_FROM,
    to,
    subject: `SwingPost のログインコード：${code}`,
    text: [
      `ログインコードは ${code} です。`,
      '10分以内に、ログイン画面に入力してください。',
      '',
      'このメールに心当たりがない場合は、そのまま削除してください。',
    ].join('\n'),
  })
}
