import Link from 'next/link'
import type { ComponentProps } from 'react'

const base =
  'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-40'

const variants = {
  primary: 'bg-mint text-ink',
  secondary: 'border border-gray-200 bg-white text-gray-800',
} as const

type Variant = keyof typeof variants

type ButtonProps = ComponentProps<'button'> & { variant?: Variant }

export const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => (
  <button type="button" className={`${base} ${variants[variant]} ${className}`} {...props} />
)

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant }

export const ButtonLink = ({ variant = 'primary', className = '', ...props }: ButtonLinkProps) => (
  <Link className={`${base} ${variants[variant]} ${className}`} {...props} />
)
