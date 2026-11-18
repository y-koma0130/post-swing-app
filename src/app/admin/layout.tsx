import type { ReactNode } from 'react'
import { Logo } from '@/app/components/Logo'
import { StagingBadge } from '@/app/components/StagingBadge'

type Props = {
  children: ReactNode
}

// 管理画面：PC前提
const AdminLayout = ({ children }: Props) => (
  <div className="bg-surface min-h-dvh">
    <header className="border-line-soft border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-3">
        <Logo height={36} />
        <StagingBadge />
      </div>
    </header>
    {children}
  </div>
)

export default AdminLayout
