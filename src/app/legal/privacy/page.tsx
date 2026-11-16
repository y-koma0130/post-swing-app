import type { Metadata } from 'next'
import { LegalDraftNotice } from '../LegalDraftNotice'

export const metadata: Metadata = { title: 'プライバシーポリシー' }

const PrivacyPage = () => (
  <>
    <h1>プライバシーポリシー</h1>
    <LegalDraftNotice />
    <h2>1. 取得する情報</h2>
    <ul>
      <li>生徒：LINE の表示名・ユーザーID（メールアドレスは取得しません）</li>
      <li>
        コーチ：メールアドレス、プロフィール、売上の受け取りに必要な情報（Stripe が取得します）
      </li>
      <li>送られたスイング動画、添削カード、チャットの内容</li>
      <li>カード番号は取得しません（決済は Stripe が行います）</li>
    </ul>
    <h2>2. 使い方</h2>
    <p>添削の受け渡し、通知（LINE・メール）、決済、本サービスの改善のために使います。</p>
    <h2>3. 預け先</h2>
    <ul>
      <li>Cloudflare（データと動画の保存、メールの送信）</li>
      <li>Stripe（決済）</li>
      <li>LINE ヤフー（ログイン、通知）</li>
    </ul>
    <h2>4. 保存期間</h2>
    <p>動画はスレッドの終了から【90】日後に削除します。【そのほかの情報の保存期間】</p>
    <h2>5. 開示・削除の求め</h2>
    <p>【問い合わせ先】までご連絡ください。</p>
    <p>制定日：【年月日】</p>
  </>
)

export default PrivacyPage
