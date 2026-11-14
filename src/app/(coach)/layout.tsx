import Link from 'next/link'

// コーチ向け：タブレット・PC前提
export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/coach" className="text-ink font-bold">
            SwingPost
          </Link>
          <span className="text-sm text-gray-500">コーチ画面（デモ）</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  )
}
