/** 変換・送信の進み具合 */
export const Progress = ({ value, label }: { value: number; label: string }) => (
  <div className="space-y-1">
    <div className="bg-line-soft h-2 overflow-hidden rounded-full">
      <div
        className="bg-mint h-full transition-[width]"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
    <p className="text-caption text-muted">
      {label} {Math.round(value * 100)}%
    </p>
  </div>
)
