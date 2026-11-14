import { ButtonLink } from '@/app/components/ui/Button'
import { getCurrentCoachSlug } from '@/server/features/coach/presentation/queries'

const DemoIndexPage = async () => {
  const coachSlug = await getCurrentCoachSlug()
  const screens = [
    { href: `/c/${coachSlug}`, label: '受付ページ（生徒）' },
    { href: `/c/${coachSlug}/apply`, label: '申し込み・動画送信（生徒）' },
    { href: '/coach', label: 'コーチのホーム' },
    { href: '/coach/threads/th_001', label: '添削画面（コーチ）' },
    { href: '/t/th_002', label: '閲覧ページ（生徒）' },
    { href: '/mock/line', label: 'LINE通知の見た目' },
  ]

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-mint text-sm font-bold">SwingPost デモ</p>
      <h1 className="mt-2 text-2xl leading-snug font-bold">
        フォロワーに、
        <br />
        スイング添削を届けよう。
      </h1>
      <ul className="mt-10 space-y-3">
        {screens.map((s) => (
          <li key={s.href}>
            <ButtonLink href={s.href} variant="secondary" className="w-full justify-between">
              {s.label} <span aria-hidden>→</span>
            </ButtonLink>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default DemoIndexPage
