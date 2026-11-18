import type { Metadata, Viewport } from 'next'
import { getSiteUrl } from '@/server/utils/siteUrl'
import './globals.css'

const DESCRIPTION = 'ゴルフのレッスンプロが、スイング動画の添削を月額で届けられる場所'

/** SNS で共有したときのカード。ページごとに上書きしなければ、この既定の画像を出す */
export const generateMetadata = (): Metadata => ({
  // カードの画像などを絶対 URL にするため（staging と本番で変わる）
  metadataBase: getSiteUrl(),
  title: { default: 'SwingPost', template: '%s | SwingPost' },
  description: DESCRIPTION,
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    siteName: 'SwingPost',
    locale: 'ja_JP',
    type: 'website',
    description: DESCRIPTION,
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'SwingPost' }],
  },
  twitter: { card: 'summary_large_image' },
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
