'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { CopyButton, type CopyResult } from '@/app/components/ui/CopyButton'

type Props = {
  /** 受付ページの URL（https://swingpost.app/c/yamada-golf） */
  url: string
  /** 受付ページへのパス（/c/yamada-golf） */
  path: string
}

/**
 * 自分の受付ページの URL（設定の先頭に置く）。
 * インスタのプロフィールなどに貼るものなので、大きく出してワンタップでコピーできるようにする
 */
export const PageLinkCard = ({ url, path }: Props) => {
  const [copy, setCopy] = useState<CopyResult | null>(null)

  // 「コピーしました」は少しのあいだだけ出す
  useEffect(() => {
    if (copy === null) return
    const timer = setTimeout(() => setCopy(null), 2500)
    return () => clearTimeout(timer)
  }, [copy])

  return (
    <Card className="space-y-3">
      <h2 className="text-heading">あなたの受付ページ</h2>
      <div className="bg-mint-soft flex items-center gap-2 rounded-xl py-2 pr-2 pl-4">
        <Link
          href={path}
          className="text-ink focus-visible:ring-mint active:bg-mint-soft min-w-0 flex-1 rounded-sm font-bold break-all underline-offset-2 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
        >
          {url}
        </Link>
        <CopyButton text={url} label="URLをコピー" onResult={setCopy} />
      </div>
      <p className="text-caption text-muted" role="status">
        {copy === 'copied'
          ? 'コピーしました。インスタのプロフィールやストーリーに貼って案内しましょう'
          : copy === 'failed'
            ? 'コピーできませんでした。URL を長押しして選び、コピーしてください'
            : 'インスタのプロフィールやストーリーに貼って、生徒に案内しましょう。URL はプロフィールで変えられます'}
      </p>
    </Card>
  )
}
