import type { ReactNode } from 'react'
import { SiteFooter } from '@/app/components/SiteFooter'

type Props = {
  children: ReactNode
}

// 生徒向け：スマホ前提の1カラム
const StudentLayout = ({ children }: Props) => (
  <div className="mx-auto min-h-dvh max-w-md bg-white">
    {children}
    <SiteFooter />
  </div>
)

export default StudentLayout
