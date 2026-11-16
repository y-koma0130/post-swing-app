import type { Metadata } from 'next'
import { LegalDraftNotice } from '../LegalDraftNotice'

export const metadata: Metadata = { title: '特定商取引法に基づく表記' }

const ROWS = [
  ['販売事業者', '【運営者名】'],
  ['運営責任者', '【氏名】'],
  ['所在地', '【住所】（個人の場合、請求があれば遅滞なく開示します）'],
  ['電話番号', '【電話番号】（個人の場合、請求があれば遅滞なく開示します）'],
  ['メールアドレス', '【問い合わせ用のアドレス】'],
  ['販売価格', '各コーチの受付ページに表示（税込）'],
  ['商品代金以外の必要料金', 'インターネット接続の通信料'],
  ['支払い方法', 'クレジットカード（Stripe）'],
  ['支払い時期', '申し込み時。月額プランは毎月の更新日'],
  ['提供時期', '支払い後すぐにスレッドが始まり、動画を送れます'],
  [
    '返品・キャンセル',
    '【返金の条件】。月額プランはマイページからいつでも解約でき、次の更新日から請求されません',
  ],
] as const

const CommercePage = () => (
  <>
    <h1>特定商取引法に基づく表記</h1>
    <LegalDraftNotice />
    <table className="w-full text-left">
      <tbody>
        {ROWS.map(([label, value]) => (
          <tr key={label} className="border-line-soft border-t align-top">
            <th className="w-40 py-3 pr-4 font-bold">{label}</th>
            <td className="py-3">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
)

export default CommercePage
