'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  { href: '/coach', label: 'ホーム' },
  { href: '/coach/students', label: '生徒' },
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
    <nav className="order-last -mx-2.5 flex w-full [scrollbar-width:none] items-center gap-0.5 overflow-x-auto text-sm whitespace-nowrap sm:order-none sm:mx-0 sm:ml-auto sm:w-auto sm:gap-1">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-2.5 py-1.5 transition-colors sm:px-3 ${
              active ? 'bg-mint-soft text-ink font-semibold' : 'text-muted hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
