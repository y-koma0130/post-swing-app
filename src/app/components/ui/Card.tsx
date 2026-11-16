import type { ComponentProps } from 'react'

export const Card = ({ className = '', ...props }: ComponentProps<'div'>) => (
  <div
    className={`rounded-card border-line-soft border bg-white p-5 shadow-sm ${className}`}
    {...props}
  />
)
