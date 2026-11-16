type Props = {
  title: string
  description: string
}

/** ドリル。ふだんはタイトルだけ出し、押すとやり方が開く（時系列を短く保つ） */
export const DrillDetails = ({ title, description }: Props) =>
  description ? (
    <details className="group bg-mint-soft rounded-xl px-3 py-2">
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-bold">
        <span>ドリル：{title}</span>
        <span className="text-caption text-muted font-normal group-open:hidden">やり方を見る</span>
        <span className="text-caption text-muted hidden font-normal group-open:inline">閉じる</span>
      </summary>
      <p className="text-caption text-body mt-2 whitespace-pre-wrap">{description}</p>
    </details>
  ) : (
    <p className="bg-mint-soft text-ink rounded-xl px-3 py-2 text-sm font-bold">ドリル：{title}</p>
  )
