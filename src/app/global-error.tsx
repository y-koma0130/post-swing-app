'use client'

import { buttonClass } from '@/app/components/ui/Button'
import './globals.css'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

/** いちばん外のレイアウトまで壊れたとき。部品に頼らず、これだけで表示できるようにする */
const GlobalError = ({ error, reset }: Props) => (
  <html lang="ja">
    <body>
      <main className="bg-surface flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-title">うまく表示できませんでした</h1>
        <p className="text-muted text-sm">時間をおいて、もう一度お試しください。</p>
        {error.digest && <p className="text-caption text-muted">エラー番号：{error.digest}</p>}
        <button type="button" onClick={reset} className={buttonClass()}>
          もう一度読み込む
        </button>
      </main>
    </body>
  </html>
)

export default GlobalError
