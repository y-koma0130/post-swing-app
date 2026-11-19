'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Card } from '@/app/components/ui/Card'
import { iconButtonClass } from '@/app/components/ui/choiceStyles'

type Props = {
  /** 受付ページの URL（https://swingpost.app/c/yamada-golf） */
  url: string
  /** 受付ページへのパス（/c/yamada-golf） */
  path: string
}

type CopyState = 'idle' | 'copied' | 'failed'

/**
 * 自分の受付ページの URL（設定の先頭に置く）。
 * インスタのプロフィールなどに貼るものなので、大きく出してワンタップでコピーできるようにする
 */
export const PageLinkCard = ({ url, path }: Props) => {
  const [copy, setCopy] = useState<CopyState>('idle')

  // 「コピーしました」は少しのあいだだけ出す
  useEffect(() => {
    if (copy === 'idle') return
    const timer = setTimeout(() => setCopy('idle'), 2500)
    return () => clearTimeout(timer)
  }, [copy])

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-heading">あなたの受付ページ</h2>
      <div className="bg-mint-soft flex items-center gap-2 rounded-xl py-2 pr-2 pl-4">
        <Link
          href={path}
          className="text-ink min-w-0 flex-1 font-bold break-all underline-offset-2 hover:underline"
        >
          {url}
        </Link>
        <button
          type="button"
          onClick={onCopy}
          aria-label="URLをコピー"
          className={`${iconButtonClass} flex size-10 shrink-0 items-center justify-center bg-white`}
        >
          {copy === 'copied' ? <CheckIcon /> : <CopyIcon />}
        </button>
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

const CopyIcon = () => (
  <svg viewBox="0 0 20 20" className="size-5" aria-hidden="true">
    <rect
      x="7"
      y="7"
      width="10"
      height="10"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <path
      d="M13 4.5V4a1.5 1.5 0 0 0-1.5-1.5h-7A1.5 1.5 0 0 0 3 4v7a1.5 1.5 0 0 0 1.5 1.5H5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 20 20" className="text-mint-text size-5" aria-hidden="true">
    <path
      d="M4.5 10.5l3.5 3.5 7.5-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
