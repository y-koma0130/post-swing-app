import Link from 'next/link'
import { COACH_TERMS_URL, PRIVACY_POLICY_URL } from '@/app/utils/externalLinks'

/**
 * 規約などへのリンク。生徒向けの画面と申し込みの画面に出す。
 * 生徒向けの利用規約と特定商取引法の表記はこのアプリに、プライバシーポリシーとコーチ向けの利用規約は LP にある
 */
export const SiteFooter = () => (
  <footer className="text-caption text-muted flex flex-wrap justify-center gap-x-4 gap-y-2 px-6 py-10 whitespace-nowrap">
    <Link href="/legal/terms">利用規約</Link>
    <a href={PRIVACY_POLICY_URL}>プライバシーポリシー</a>
    <Link href="/legal/commerce">特定商取引法に基づく表記</Link>
    <a href={COACH_TERMS_URL}>コーチ向け利用規約</a>
  </footer>
)
