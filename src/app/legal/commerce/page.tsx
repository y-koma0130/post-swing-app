import type { Metadata } from 'next'
import { SYSTEM_FEE_YEN } from '@/app/features/apply/utils/systemFeeText'
import { COACH_LP_URL, CONTACT_EMAIL, OPERATOR_NAME } from '@/app/utils/externalLinks'

export const metadata: Metadata = { title: '特定商取引法に基づく表記' }

const fee = `${SYSTEM_FEE_YEN.toLocaleString('ja-JP')}円`

const ROWS = [
  ['販売事業者', OPERATOR_NAME],
  ['運営統括責任者', OPERATOR_NAME],
  ['所在地', 'ご請求があった場合、遅滞なく開示します。'],
  [
    '電話番号',
    'ご請求があった場合、遅滞なく開示します。お問い合わせは、下記のメールアドレスにお願いします。',
  ],
  ['メールアドレス', CONTACT_EMAIL],
  ['サービスの名称', 'SwingPost（ゴルフのスイング動画のオンライン添削）'],
  ['販売価格', '各コーチの受付ページに表示（税込）'],
  [
    '商品代金以外の必要料金',
    `システム利用料 ${fee}（税込）／申し込みごと（月額プランは毎月）。インターネット接続の通信料`,
  ],
  ['支払い方法', 'クレジットカード（Stripe）'],
  [
    '支払い時期',
    '申し込みのときにカードの利用枠を確保し、コーチが申し込みを受け付けた時点で請求します。月額プランの2か月目からは毎月の更新日',
  ],
  [
    '提供時期',
    'コーチが申し込みを受け付けた時点（申し込みから48時間以内）で、添削のやり取り（スレッド）が始まります。期限までに受け付けられなかった申し込みは取り消され、請求されません',
  ],
  [
    'キャンセル・返金',
    '受け付けられる前の申し込みは、コーチがお受けできなかったとき・期限が切れたときに取り消され、請求されません。受け付けたあとは、サービスの性質上、原則として返金しません（コーチが添削を返さない場合などは、利用規約に従って返金することがあります）。月額プランはマイページからいつでも解約でき、次の更新日から請求されません',
  ],
  [
    '動作環境',
    '最新版の iOS・Android のスマートフォン、またはパソコンの主要ブラウザ（Chrome・Safari・Edge）の最新版',
  ],
] as const

/** 生徒向けの表記（コーチ向けは LP にある） */
const CommercePage = () => (
  <>
    <h1>特定商取引法に基づく表記</h1>
    <p>
      生徒向けにご提供する「SwingPost」の申し込み（添削とシステム利用料）に関する表記です。コーチ向けの表記は
      <a href={`${COACH_LP_URL}/tokushoho/`} className="underline">
        こちら
      </a>
      。
    </p>
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
