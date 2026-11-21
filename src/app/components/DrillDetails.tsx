import { DisclosureToggle, summaryClass } from '@/app/components/ui/DisclosureToggle'
import { DrillVideoPlayer } from '@/app/components/video/DrillVideoPlayer'
import type { DrillVideoDto } from '@/server/features/drill/application/dto/Drill.dto'

type Props = {
  title: string
  description: string
  /** お手本の動画（上げた動画か YouTube）。動画のないドリルなら null */
  video: DrillVideoDto | null
}

/**
 * ドリル。ふだんはタイトルだけ出し、押すとお手本の動画とやり方が開く（時系列を短く保つ）。
 * 動画は開いたときだけ読み込む
 */
export const DrillDetails = ({ title, description, video }: Props) =>
  description || video ? (
    <details className="group bg-mint-soft rounded-xl px-3 py-2">
      {/* 狭いときは、ボタンを下の行に回して名前を折り返さない */}
      <summary className={`${summaryClass} text-ink flex-wrap text-sm font-bold`}>
        <span className="min-w-[8rem] flex-1">ドリル：{title}</span>
        <DisclosureToggle closedLabel={video ? 'お手本を見る' : 'やり方を見る'} />
      </summary>
      <div className="mt-2 space-y-2">
        {video && <DrillVideoPlayer video={video} />}
        {description && <p className="text-caption text-body whitespace-pre-wrap">{description}</p>}
      </div>
    </details>
  ) : (
    <p className="bg-mint-soft text-ink rounded-xl px-3 py-2 text-sm font-bold">ドリル：{title}</p>
  )
