import Link from 'next/link'

/** 規約などへのリンク。生徒向けの画面と申し込みの画面に出す */
export const SiteFooter = () => (
  <footer className="text-caption text-subtle flex flex-wrap justify-center gap-x-4 gap-y-2 px-6 py-10 whitespace-nowrap">
    <Link href="/legal/terms">利用規約</Link>
    <Link href="/legal/privacy">プライバシーポリシー</Link>
    <Link href="/legal/commerce">特定商取引法に基づく表記</Link>
  </footer>
)
