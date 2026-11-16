type Props = {
  className?: string
}

/** 読み込み中の灰色の箱。大きさは className で決める */
export const Skeleton = ({ className = '' }: Props) => (
  <div aria-hidden className={`bg-line-soft animate-pulse rounded-xl ${className}`} />
)

/** 読み込み中の画面（見出し＋カード数枚）。loading.tsx で使う */
export const PageSkeleton = () => (
  <div role="status" aria-label="読み込み中" className="space-y-6">
    <Skeleton className="h-7 w-40" />
    <div className="space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
)
