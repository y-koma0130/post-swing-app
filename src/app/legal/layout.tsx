import type { ReactNode } from 'react'
import { SiteFooter } from '@/app/components/SiteFooter'

type Props = {
  children: ReactNode
}

const LegalLayout = ({ children }: Props) => (
  <div className="mx-auto max-w-2xl">
    <main className="text-body space-y-6 px-6 py-12 text-sm leading-relaxed [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-8 [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      {children}
    </main>
    <SiteFooter />
  </div>
)

export default LegalLayout
