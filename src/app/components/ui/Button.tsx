import Link from 'next/link'
import type { ComponentProps } from 'react'

/**
 * ボタンの見た目（画面ごとに作らず、ここの組み合わせだけを使う）
 * - primary：その画面でいちばん押してほしい1つ（送る・保存する・申し込む）
 * - secondary：ほかの操作（編集・選ぶ）
 * - ghost：目立たせない操作（外す・閉じる）
 * - danger：取り消せない操作（削除・返金）
 */
const variants = {
  primary: 'bg-mint text-ink hover:opacity-90',
  secondary: 'border border-line bg-white text-body hover:bg-surface',
  ghost: 'text-muted hover:text-ink',
  danger: 'border border-danger/40 bg-white text-danger hover:bg-danger-soft',
} as const

/** md：ふつう、sm：一覧の中の小さな操作、lg：画面の下の大きな申し込みボタン */
const sizes = {
  sm: 'px-3 py-1.5 text-caption',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

/** ボタンの見た目のクラス（ファイル選択の label など、button 以外をボタンに見せるときにも使う） */
export const buttonClass = ({
  variant = 'primary',
  size = 'md',
}: {
  variant?: ButtonVariant | undefined
  size?: ButtonSize | undefined
} = {}): string =>
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition',
    'focus-visible:ring-mint focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-40',
    variants[variant],
    sizes[size],
  ].join(' ')

type Style = { variant?: ButtonVariant | undefined; size?: ButtonSize | undefined }

type ButtonProps = ComponentProps<'button'> & Style

export const Button = ({ variant, size, className = '', ...props }: ButtonProps) => (
  <button type="button" className={`${buttonClass({ variant, size })} ${className}`} {...props} />
)

type ButtonLinkProps = ComponentProps<typeof Link> & Style

export const ButtonLink = ({ variant, size, className = '', ...props }: ButtonLinkProps) => (
  <Link className={`${buttonClass({ variant, size })} ${className}`} {...props} />
)
