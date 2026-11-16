import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: ReactNode
  /** 次にすること（ボタンなど） */
  action?: ReactNode
}

/** 表示するものがまだないとき。「ない」だけでなく、次に何をすればいいかを書く */
export const EmptyState = ({ title, description, action }: Props) => (
  <div className="border-line rounded-card space-y-2 border border-dashed px-5 py-8 text-center">
    <p className="text-sm font-bold">{title}</p>
    {description && <p className="text-muted text-sm leading-relaxed">{description}</p>}
    {action && <div className="pt-2">{action}</div>}
  </div>
)
