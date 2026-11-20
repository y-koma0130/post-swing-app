import Link from 'next/link'
import type { ComponentProps } from 'react'
import { PRESSED_CLASS } from './pressStyles'

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
  pending = false,
}: {
  variant?: ButtonVariant | undefined
  size?: ButtonSize | undefined
  /** 処理中。押せないが、「使えない」ように薄くはしない */
  pending?: boolean | undefined
} = {}): string =>
  [
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold transition',
    'focus-visible:ring-mint focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
    // 押した瞬間に少し沈ませる（スマホでは hover が効かないので、押したことが分かるように）
    'active:scale-[0.97]',
    pending ? 'cursor-wait opacity-80' : 'disabled:cursor-not-allowed disabled:opacity-40',
    variants[variant],
    sizes[size],
  ].join(' ')

type Style = { variant?: ButtonVariant | undefined; size?: ButtonSize | undefined }

type ButtonProps = ComponentProps<'button'> &
  Style & {
    /** 処理中：くるくるを出して押せなくする。文言は呼び出し側で「〜しています…」に変える */
    pending?: boolean | undefined
  }

export const Button = ({
  variant,
  size,
  pending = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) => (
  <button
    type="button"
    className={`${buttonClass({ variant, size, pending })} ${className}`}
    disabled={pending || disabled}
    aria-busy={pending || undefined}
    {...props}
  >
    {pending && <Spinner />}
    {children}
  </button>
)

/** 処理中のくるくる（文字の色に合わせる） */
export const Spinner = () => (
  <span
    aria-hidden
    className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
  />
)

type ButtonLinkProps = ComponentProps<typeof Link> & Style

export const ButtonLink = ({ variant, size, className = '', ...props }: ButtonLinkProps) => (
  <Link className={`${buttonClass({ variant, size })} ${className}`} {...props} />
)

/**
 * 小さな文字だけのボタン（「消す」「閉じる」「外す」「このスレッドを終える」など、目立たせない操作）。
 * 押したとき・キーボードで選んだときの見た目をそろえる。danger は取り消せない操作
 */
export const textButtonClass = ({
  danger = false,
}: {
  danger?: boolean | undefined
} = {}): string =>
  [
    // 押した瞬間は背景を薄いミントにする（余白の分だけ外に広げて、文字の位置は変えない）
    `-mx-1 inline-flex items-center gap-1 rounded px-1 text-caption underline underline-offset-2 transition-colors ${PRESSED_CLASS}`,
    danger ? 'text-danger hover:opacity-80' : 'text-muted hover:text-ink active:text-ink',
    'focus-visible:ring-mint focus-visible:ring-2 focus-visible:outline-none',
    'disabled:cursor-wait disabled:opacity-60',
  ].join(' ')

type TextButtonProps = ComponentProps<'button'> & { danger?: boolean | undefined }

export const TextButton = ({ danger, className = '', ...props }: TextButtonProps) => (
  <button type="button" className={`${textButtonClass({ danger })} ${className}`} {...props} />
)
