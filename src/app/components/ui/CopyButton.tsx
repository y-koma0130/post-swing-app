'use client'

import { useEffect, useState } from 'react'
import { iconButtonClass } from './choiceStyles'

export type CopyResult = 'copied' | 'failed'

type Props = {
  /** コピーする文字 */
  text: string
  /** 読み上げ・ツールチップの文言（「URLをコピー」など） */
  label: string
  /** コピーできたか（画面に案内を出すとき） */
  onResult?: ((result: CopyResult) => void) | undefined
  className?: string | undefined
}

/**
 * コピーのボタン（アイコンだけ）。押すとチェックに変わり、少しのあいだで戻る。
 * コピーできなかったとき（古いブラウザ・権限がない）は onResult で知らせる
 */
export const CopyButton = ({ text, label, onResult, className = '' }: Props) => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [copied])

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onResult?.('copied')
    } catch {
      onResult?.('failed')
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={copied ? 'コピーしました' : label}
      title={label}
      className={`${iconButtonClass} flex size-10 shrink-0 items-center justify-center bg-white ${className}`}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
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
