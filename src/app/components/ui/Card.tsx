import type { ComponentProps } from 'react'

export const Card = ({ className = '', ...props }: ComponentProps<'div'>) => (
  <div
    className={`rounded-card border border-gray-100 bg-white p-5 shadow-sm ${className}`}
    {...props}
  />
)
