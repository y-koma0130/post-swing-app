import { DisclosureToggle, summaryClass } from '@/app/components/ui/DisclosureToggle'
import { DrillVideoPlayer } from '@/app/components/video/DrillVideoPlayer'
import { InstagramLink } from '@/app/components/video/InstagramLink'
import type { DrillVideoDto } from '@/server/features/drill/application/dto/Drill.dto'

type Props = {
  title: string
  description: string
  /** お手本の動画。動画のないドリルなら null */
  video: DrillVideoDto | null
}

/**
 * ドリル。ふだんはタイトルだけ出し、押すとお手本の動画とやり方が開く（時系列を短く保つ）。
 * 動画は開いたときだけ読み込む。Instagram の投稿は開くリンクで軽いので、閉じたままでも出す
 * （開いてからもう一度押させない）
 */
export const DrillDetails = ({ title, description, video }: Props) => {
  const instagram = video?.kind === 'instagram' ? video : null
  const folded = instagram ? null : video
  return (
    <div className="bg-mint-soft space-y-2 rounded-xl px-3 py-2">
      {description || folded ? (
        <details className="group">
          {/* 狭いときは、ボタンを下の行に回して名前を折り返さない */}
          <summary className={`${summaryClass} text-ink flex-wrap text-sm font-bold`}>
            <span className="min-w-[8rem] flex-1">ドリル：{title}</span>
            <DisclosureToggle closedLabel={folded ? 'お手本を見る' : 'やり方を見る'} />
          </summary>
          <div className="mt-2 space-y-2">
            {folded && <DrillVideoPlayer video={folded} />}
            {description && (
              <p className="text-caption text-body whitespace-pre-wrap">{description}</p>
            )}
          </div>
        </details>
      ) : (
        <p className="text-ink text-sm font-bold">ドリル：{title}</p>
      )}
      {instagram && <InstagramLink url={instagram.url} />}
    </div>
  )
}
