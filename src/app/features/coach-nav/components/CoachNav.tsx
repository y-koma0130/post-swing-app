'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PRESSED_CLASS } from '@/app/components/ui/pressStyles'

const ITEMS = [
  { href: '/coach', label: 'ホーム' },
  { href: '/coach/students', label: '生徒一覧' },
  { href: '/coach/drills', label: 'ドリル' },
  { href: '/coach/availability', label: '不在・返信' },
  { href: '/coach/settings', label: '設定' },
] as const

/** ホームはスレッドの画面も含める（スレッドはホームから開くため） */
const isActive = (pathname: string, href: string): boolean =>
  href === '/coach'
    ? pathname === '/coach' || pathname.startsWith('/coach/threads/')
    : pathname === href || pathname.startsWith(`${href}/`)

/** コーチのヘッダーのメニュー。今いる画面を塗る。スマホではロゴの下の段に並べる */
export const CoachNav = () => {
  const pathname = usePathname()
  return (
    // スマホでは5つを等分に並べ、どれも切れずに収まるようにする（文字も少し小さく）
    <nav className="text-caption order-last grid w-full grid-cols-5 items-center gap-0.5 whitespace-nowrap sm:order-none sm:ml-auto sm:flex sm:w-auto sm:gap-1 sm:text-sm">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`focus-visible:ring-mint rounded-full px-1 py-1.5 text-center transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-3 ${
              active
                ? 'bg-mint-soft text-ink font-semibold'
                : `text-muted hover:bg-surface hover:text-ink ${PRESSED_CLASS} active:text-ink`
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
