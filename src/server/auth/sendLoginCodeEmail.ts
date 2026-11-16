import 'server-only'
import { sendEmail } from '@/server/features/notification/public'

/**
 * ログイン用の6桁コードをメールで送る（開発中は送らずにログへ出る。件名にコードを入れている）
 */
export const sendLoginCodeEmail = async ({ to, code }: { to: string; code: string }) => {
  await sendEmail({
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
